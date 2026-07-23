
-- ============================================================
-- Stage C — Portal access remediation
-- ============================================================

-- ---- 1. Stage B follow-ups ----------------------------------

-- 1a. Concurrency-safe last-owner check via per-clinic advisory lock.
CREATE OR REPLACE FUNCTION public.clinic_members_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _claims jsonb;
  _is_service boolean := false;
  _clinic uuid;
  _target uuid;
  _new_role clinic_role;
  _old_role clinic_role;
  _new_active boolean;
  _old_active boolean;
  _caller_role clinic_role;
  _active_owner_count int;
BEGIN
  BEGIN
    _claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    _claims := NULL;
  END;
  IF _claims IS NULL OR (_claims->>'role') = 'service_role' THEN
    _is_service := true;
  END IF;
  IF _is_service THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _clinic := COALESCE(NEW.clinic_id, OLD.clinic_id);
  _target := COALESCE(NEW.user_id, OLD.user_id);
  _new_role := NEW.role;
  _old_role := OLD.role;
  _new_active := NEW.is_active;
  _old_active := OLD.is_active;

  IF NOT public.is_super_admin(_caller) THEN
    SELECT role INTO _caller_role
      FROM public.clinic_members
     WHERE clinic_id = _clinic AND user_id = _caller AND is_active = true;
    IF _caller_role IS NULL OR _caller_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'not authorized to manage staff for this clinic';
    END IF;

    IF (TG_OP = 'INSERT' AND _new_role = 'owner' AND _caller_role <> 'owner')
       OR (TG_OP = 'UPDATE' AND (_old_role = 'owner' OR _new_role = 'owner')
           AND _caller_role <> 'owner')
       OR (TG_OP = 'DELETE' AND _old_role = 'owner' AND _caller_role <> 'owner')
    THEN
      RAISE EXCEPTION 'admins cannot manage owner memberships';
    END IF;

    IF TG_OP IN ('INSERT','UPDATE') AND _target = _caller
       AND _new_role = 'owner' AND (TG_OP = 'INSERT' OR _old_role <> 'owner')
    THEN
      RAISE EXCEPTION 'cannot promote yourself to owner';
    END IF;
  END IF;

  -- Concurrency-safe last-active-owner invariant. Serialize any
  -- write that could reduce owner count for this clinic.
  IF (TG_OP = 'DELETE' AND _old_role = 'owner' AND _old_active = true)
     OR (TG_OP = 'UPDATE' AND _old_role = 'owner' AND _old_active = true
         AND (_new_role <> 'owner' OR _new_active = false)) THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('clinic_owner_lock:' || _clinic::text, 0)
    );
    SELECT COUNT(*) INTO _active_owner_count
      FROM public.clinic_members
     WHERE clinic_id = _clinic AND role = 'owner'
       AND is_active = true AND user_id <> _target;
    IF _active_owner_count = 0 THEN
      RAISE EXCEPTION 'cannot remove or demote the last active owner';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 1b. Mask email in staff-invitation peek.
CREATE OR REPLACE FUNCTION public.peek_clinic_invitation(_raw_token text)
 RETURNS TABLE(email text, role clinic_role, valid boolean, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _hash text;
  _inv record;
  _mask text;
BEGIN
  IF _raw_token IS NULL OR length(_raw_token) < 16 THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'invalid';
    RETURN;
  END IF;
  _hash := encode(extensions.digest(_raw_token, 'sha256'), 'hex');
  SELECT * INTO _inv FROM public.invitations WHERE token_hash = _hash;
  IF _inv IS NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'not_found'; RETURN;
  END IF;
  IF _inv.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'used'; RETURN;
  END IF;
  IF _inv.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'revoked'; RETURN;
  END IF;
  IF _inv.expires_at <= now() THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'expired'; RETURN;
  END IF;
  _mask := public._mask_email(_inv.email);
  RETURN QUERY SELECT _mask, _inv.clinic_role, true, NULL::text;
END;
$function$;

-- Helper: mask an email to "a***@example.com"
CREATE OR REPLACE FUNCTION public._mask_email(_email text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _email IS NULL OR position('@' in _email) = 0 THEN NULL
    ELSE
      substring(split_part(_email,'@',1) from 1 for 1)
      || '***@' || split_part(_email,'@',2)
  END
$function$;

-- ---- 2. Remove email-only patient linking -------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Base profile ONLY. No implicit staff or portal grants.
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$function$;

-- ---- 3. Composite integrity: patient must belong to clinic ----

-- Ensure a composite target for FKs referencing (id, clinic_id)
ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_id_clinic_id_key;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_id_clinic_id_key UNIQUE (id, clinic_id);

-- ---- 4. Extend patient_portal_users -------------------------

ALTER TABLE public.patient_portal_users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS invitation_id uuid,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- One portal identity per patient (defer guardian/family accounts).
CREATE UNIQUE INDEX IF NOT EXISTS patient_portal_users_active_per_patient_uq
  ON public.patient_portal_users (patient_id)
  WHERE is_active = true;

-- Composite FK: (patient_id, clinic_id) must match a real patient row.
ALTER TABLE public.patient_portal_users
  DROP CONSTRAINT IF EXISTS patient_portal_users_patient_clinic_fk;
ALTER TABLE public.patient_portal_users
  ADD CONSTRAINT patient_portal_users_patient_clinic_fk
  FOREIGN KEY (patient_id, clinic_id)
  REFERENCES public.patients(id, clinic_id)
  ON DELETE CASCADE;

-- ---- 5. Patient portal invitation table ---------------------

CREATE TABLE IF NOT EXISTS public.patient_portal_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT patient_portal_invitations_patient_clinic_fk
    FOREIGN KEY (patient_id, clinic_id)
    REFERENCES public.patients(id, clinic_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ppi_clinic_idx ON public.patient_portal_invitations(clinic_id);
CREATE INDEX IF NOT EXISTS ppi_patient_idx ON public.patient_portal_invitations(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS ppi_active_per_patient_email_uq
  ON public.patient_portal_invitations (patient_id, lower(email))
  WHERE used_at IS NULL AND revoked_at IS NULL;

GRANT SELECT ON public.patient_portal_invitations TO authenticated;
GRANT ALL ON public.patient_portal_invitations TO service_role;

ALTER TABLE public.patient_portal_invitations ENABLE ROW LEVEL SECURITY;

-- Staff-scoped read (no anon, no portal user). Token hashes are still in
-- the row; block reading them via a column-level revoke.
REVOKE SELECT (token_hash) ON public.patient_portal_invitations FROM authenticated;

CREATE POLICY ppi_read_clinic_admins
  ON public.patient_portal_invitations
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_clinic_role(auth.uid(), clinic_id,
         ARRAY['owner','admin','front_desk']::clinic_role[])
  );

-- All writes go through SECURITY DEFINER RPCs.
CREATE POLICY ppi_no_direct_write
  ON public.patient_portal_invitations
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- ---- 6. Patient-visibility flags ----------------------------

ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS is_patient_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.patient_files
  ADD COLUMN IF NOT EXISTS is_patient_visible boolean NOT NULL DEFAULT false;

-- ---- 7. Portal identity + RLS tightening --------------------

CREATE OR REPLACE FUNCTION public.current_portal_patient_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT patient_id
    FROM public.patient_portal_users
   WHERE user_id = auth.uid()
     AND is_active = true
$function$;

CREATE OR REPLACE FUNCTION public.current_portal_clinic_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT clinic_id
    FROM public.patient_portal_users
   WHERE user_id = auth.uid()
     AND is_active = true
$function$;

-- Block patient_portal_users direct writes; keep read policies as-is
-- (portal user reads own row, staff reads clinic rows). Drop stale
-- write policies if any exist.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
     WHERE schemaname='public' AND tablename='patient_portal_users'
       AND cmd IN ('INSERT','UPDATE','DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.patient_portal_users', r.policyname);
  END LOOP;
END $$;

CREATE POLICY ppu_no_direct_write
  ON public.patient_portal_users
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Tighten portal SELECT policies that already exist: require the
-- record to be visible (patient plans / files / issued invoices).
DROP POLICY IF EXISTS "Portal: patient reads own treatment plans" ON public.treatment_plans;
CREATE POLICY "Portal: patient reads own treatment plans"
  ON public.treatment_plans FOR SELECT TO authenticated
  USING (
    patient_id = public.current_portal_patient_id()
    AND is_patient_visible = true
  );

DROP POLICY IF EXISTS "Portal: patient reads own plan items" ON public.treatment_plan_items;
CREATE POLICY "Portal: patient reads own plan items"
  ON public.treatment_plan_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_plans tp
      WHERE tp.id = treatment_plan_items.plan_id
        AND tp.patient_id = public.current_portal_patient_id()
        AND tp.is_patient_visible = true
    )
  );

DROP POLICY IF EXISTS "Portal: patient reads own invoices" ON public.invoices;
CREATE POLICY "Portal: patient reads own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    patient_id = public.current_portal_patient_id()
    AND status IN ('sent','partial','paid','overdue')
  );

-- Patient-visible files (portal read).
CREATE POLICY "Portal: patient reads own visible files"
  ON public.patient_files FOR SELECT TO authenticated
  USING (
    patient_id = public.current_portal_patient_id()
    AND is_patient_visible = true
  );

-- ---- 8. Portal invitation RPCs ------------------------------

-- Create a portal invitation (owner/admin/front_desk, same clinic).
CREATE OR REPLACE FUNCTION public.create_portal_invitation(
  _patient_id uuid, _email text,
  _expires_at timestamptz DEFAULT now() + interval '14 days'
) RETURNS TABLE(id uuid, raw_token text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _clinic uuid;
  _norm text := lower(trim(_email));
  _raw text; _hash text; _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _norm IS NULL OR _norm !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  IF _expires_at <= now() OR _expires_at > now() + interval '30 days' THEN
    RAISE EXCEPTION 'invalid expiry';
  END IF;

  SELECT clinic_id INTO _clinic FROM public.patients WHERE id = _patient_id;
  IF _clinic IS NULL THEN RAISE EXCEPTION 'patient not found'; END IF;

  IF NOT public.is_super_admin(_uid)
     AND NOT public.has_clinic_role(_uid, _clinic,
       ARRAY['owner','admin','front_desk']::clinic_role[]) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clinics WHERE id = _clinic AND is_active) THEN
    RAISE EXCEPTION 'clinic inactive';
  END IF;

  -- Transactionally revoke prior active invitations for same (patient, email).
  UPDATE public.patient_portal_invitations
     SET revoked_at = now(), revoked_by = _uid
   WHERE patient_id = _patient_id
     AND lower(email) = _norm
     AND used_at IS NULL AND revoked_at IS NULL;

  _raw := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_raw, 'sha256'), 'hex');

  INSERT INTO public.patient_portal_invitations
    (clinic_id, patient_id, email, token_hash, expires_at, invited_by)
  VALUES (_clinic, _patient_id, _norm, _hash, _expires_at, _uid)
  RETURNING patient_portal_invitations.id INTO _new_id;

  INSERT INTO public.audit_log (user_id, clinic_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _clinic, 'portal.invite.create', 'patient', _patient_id::text,
          jsonb_build_object('invitation_id', _new_id, 'email_mask', public._mask_email(_norm)));

  RETURN QUERY SELECT _new_id, _raw;
END;
$$;

REVOKE ALL ON FUNCTION public.create_portal_invitation(uuid,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_portal_invitation(uuid,text,timestamptz) TO authenticated;

-- Revoke an unused portal invitation.
CREATE OR REPLACE FUNCTION public.revoke_portal_invitation(_invitation_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _clinic uuid;
BEGIN
  SELECT clinic_id INTO _clinic FROM public.patient_portal_invitations WHERE id = _invitation_id;
  IF _clinic IS NULL THEN RAISE EXCEPTION 'invitation not found'; END IF;
  IF NOT public.is_super_admin(_uid)
     AND NOT public.has_clinic_role(_uid, _clinic,
       ARRAY['owner','admin','front_desk']::clinic_role[]) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.patient_portal_invitations
     SET revoked_at = COALESCE(revoked_at, now()),
         revoked_by = COALESCE(revoked_by, _uid)
   WHERE id = _invitation_id AND used_at IS NULL;
  INSERT INTO public.audit_log (user_id, clinic_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _clinic, 'portal.invite.revoke', 'invitation', _invitation_id::text, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_portal_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_portal_invitation(uuid) TO authenticated;

-- Revoke existing portal access (staff).
CREATE OR REPLACE FUNCTION public.revoke_portal_access(_patient_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _clinic uuid;
BEGIN
  SELECT clinic_id INTO _clinic FROM public.patients WHERE id = _patient_id;
  IF _clinic IS NULL THEN RAISE EXCEPTION 'patient not found'; END IF;
  IF NOT public.is_super_admin(_uid)
     AND NOT public.has_clinic_role(_uid, _clinic,
       ARRAY['owner','admin','front_desk']::clinic_role[]) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.patient_portal_users
     SET is_active = false, revoked_at = now(), revoked_by = _uid
   WHERE patient_id = _patient_id AND is_active = true;
  INSERT INTO public.audit_log (user_id, clinic_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _clinic, 'portal.access.revoke', 'patient', _patient_id::text, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_portal_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_portal_access(uuid) TO authenticated;

-- Public peek (masked). Callable by anon and authenticated.
CREATE OR REPLACE FUNCTION public.peek_portal_invitation(_raw_token text)
 RETURNS TABLE(valid boolean, reason text, email_masked text,
               clinic_name text, expires_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _hash text; _inv record; _clinic text;
BEGIN
  IF _raw_token IS NULL OR length(_raw_token) < 16 THEN
    RETURN QUERY SELECT false, 'invalid', NULL::text, NULL::text, NULL::timestamptz; RETURN;
  END IF;
  _hash := encode(extensions.digest(_raw_token, 'sha256'), 'hex');
  SELECT * INTO _inv FROM public.patient_portal_invitations WHERE token_hash = _hash;
  IF _inv IS NULL THEN
    RETURN QUERY SELECT false, 'not_found', NULL::text, NULL::text, NULL::timestamptz; RETURN;
  END IF;
  IF _inv.used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'used', NULL::text, NULL::text, NULL::timestamptz; RETURN;
  END IF;
  IF _inv.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'revoked', NULL::text, NULL::text, NULL::timestamptz; RETURN;
  END IF;
  IF _inv.expires_at <= now() THEN
    RETURN QUERY SELECT false, 'expired', NULL::text, NULL::text, NULL::timestamptz; RETURN;
  END IF;
  SELECT name INTO _clinic FROM public.clinics WHERE id = _inv.clinic_id;
  RETURN QUERY SELECT true, NULL::text,
                     public._mask_email(_inv.email),
                     _clinic, _inv.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.peek_portal_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_portal_invitation(text) TO anon, authenticated;

-- Accept a portal invitation (authenticated, atomic, concurrency-safe).
CREATE OR REPLACE FUNCTION public.accept_portal_invitation(_raw_token text)
 RETURNS TABLE(patient_id uuid, clinic_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _hash text; _inv record; _user_email text;
  _clinic_active boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _raw_token IS NULL OR length(_raw_token) < 16 THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  _hash := encode(extensions.digest(_raw_token, 'sha256'), 'hex');

  -- Reject any user who is already a clinic staff member: staff and
  -- patient identities are intentionally separate.
  IF EXISTS (
    SELECT 1 FROM public.clinic_members WHERE user_id = _uid AND is_active = true
  ) THEN
    RAISE EXCEPTION 'staff accounts cannot accept a patient portal invitation';
  END IF;

  -- Serialize concurrent acceptance for the same token.
  PERFORM pg_advisory_xact_lock(hashtextextended('ppi_accept:' || _hash, 0));

  SELECT * INTO _inv FROM public.patient_portal_invitations
   WHERE token_hash = _hash FOR UPDATE;
  IF _inv IS NULL THEN RAISE EXCEPTION 'invitation not found'; END IF;
  IF _inv.used_at IS NOT NULL THEN RAISE EXCEPTION 'invitation already used'; END IF;
  IF _inv.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invitation revoked'; END IF;
  IF _inv.expires_at <= now() THEN RAISE EXCEPTION 'invitation expired'; END IF;

  SELECT is_active INTO _clinic_active FROM public.clinics WHERE id = _inv.clinic_id;
  IF _clinic_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'clinic inactive'; END IF;

  SELECT lower(u.email) INTO _user_email
    FROM auth.users u
   WHERE u.id = _uid AND u.email_confirmed_at IS NOT NULL;
  IF _user_email IS NULL THEN RAISE EXCEPTION 'email not confirmed'; END IF;
  IF _user_email <> lower(_inv.email) THEN
    RAISE EXCEPTION 'invitation email does not match your account';
  END IF;

  -- Upsert active portal identity. Enforced unique-per-patient-active index
  -- guarantees a single active identity per patient.
  INSERT INTO public.patient_portal_users
    (user_id, patient_id, clinic_id, is_active, linked_at, invitation_id,
     revoked_at, revoked_by)
  VALUES (_uid, _inv.patient_id, _inv.clinic_id, true, now(), _inv.id, NULL, NULL)
  ON CONFLICT (user_id) DO UPDATE
    SET patient_id = EXCLUDED.patient_id,
        clinic_id = EXCLUDED.clinic_id,
        is_active = true,
        linked_at = now(),
        invitation_id = EXCLUDED.invitation_id,
        revoked_at = NULL,
        revoked_by = NULL;

  UPDATE public.patient_portal_invitations
     SET used_at = now(), used_by = _uid
   WHERE id = _inv.id;

  INSERT INTO public.audit_log (user_id, clinic_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _inv.clinic_id, 'portal.invite.accept', 'patient',
          _inv.patient_id::text, jsonb_build_object('invitation_id', _inv.id));

  RETURN QUERY SELECT _inv.patient_id, _inv.clinic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_portal_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_portal_invitation(text) TO authenticated;

-- Staff-facing list of portal invitations for a patient (no token hashes).
CREATE OR REPLACE FUNCTION public.list_patient_portal_invitations(_patient_id uuid)
 RETURNS TABLE(id uuid, email_masked text, expires_at timestamptz,
               used_at timestamptz, revoked_at timestamptz, created_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _clinic uuid;
BEGIN
  SELECT clinic_id INTO _clinic FROM public.patients WHERE id = _patient_id;
  IF _clinic IS NULL THEN RAISE EXCEPTION 'patient not found'; END IF;
  IF NOT public.is_super_admin(_uid)
     AND NOT public.has_clinic_role(_uid, _clinic,
       ARRAY['owner','admin','front_desk','dentist']::clinic_role[]) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT i.id, public._mask_email(i.email), i.expires_at, i.used_at,
           i.revoked_at, i.created_at
      FROM public.patient_portal_invitations i
     WHERE i.patient_id = _patient_id
     ORDER BY i.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_patient_portal_invitations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_patient_portal_invitations(uuid) TO authenticated;
