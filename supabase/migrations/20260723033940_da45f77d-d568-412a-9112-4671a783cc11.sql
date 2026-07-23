
-- =====================================================================
-- Stage B: Clinic-scoped staff + invitations, plus Stage A corrections.
-- Forward-only. No data destruction beyond the one documented merge below.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Stage A corrections
-- ---------------------------------------------------------------------

-- 0a. switch_active_clinic used a non-existent column `is_suspended`.
--     The actual clinic activity flag is `is_active`.
CREATE OR REPLACE FUNCTION public.switch_active_clinic(_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _clinic_id IS NOT NULL AND NOT public.is_super_admin(_uid) AND NOT EXISTS (
    SELECT 1 FROM public.clinic_members m
    JOIN public.clinics c ON c.id = m.clinic_id
    WHERE m.user_id = _uid
      AND m.clinic_id = _clinic_id
      AND m.is_active = true
      AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'not a member of the requested clinic, or clinic is inactive';
  END IF;

  UPDATE public.profiles
     SET active_clinic_id = _clinic_id, updated_at = now()
   WHERE id = _uid;
END;
$$;

-- 0b. set_platform_role: trust boundary.
--     TRUST BOUNDARY:
--     This function is SECURITY DEFINER and can change ANY user's platform_role.
--     EXECUTE is granted only to `service_role`. It intentionally does NOT
--     call auth.uid(): service-role requests have no signed-in database
--     session. Callers (backend server functions) MUST perform user-level
--     authorization on the request's bearer token BEFORE creating or using
--     the service-role client that invokes this RPC. The RPC only enforces
--     the last-super-admin invariant.
CREATE OR REPLACE FUNCTION public.set_platform_role(
  _target_user uuid,
  _role platform_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Last-super-admin invariant only. Caller authorization happens upstream.
  IF _role IS DISTINCT FROM 'super_admin'::platform_role THEN
    IF (SELECT COUNT(*) FROM public.profiles
          WHERE platform_role = 'super_admin' AND id <> _target_user) = 0
       AND EXISTS (SELECT 1 FROM public.profiles
                     WHERE id = _target_user AND platform_role = 'super_admin')
    THEN
      RAISE EXCEPTION 'cannot demote the last super_admin';
    END IF;
  END IF;
  UPDATE public.profiles SET platform_role = _role, updated_at = now()
   WHERE id = _target_user;
END;
$$;

REVOKE ALL ON FUNCTION public.set_platform_role(uuid, platform_role)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_platform_role(uuid, platform_role)
  TO service_role;

-- ---------------------------------------------------------------------
-- 1. clinic_members: one active membership per (clinic_id, user_id).
-- ---------------------------------------------------------------------

-- 1a. Deterministic merge of the one existing duplicate.
--     Rule: keep the highest-privilege role (order: owner > admin > dentist
--     > hygienist > assistant > front_desk > billing_specialist >
--     read_only_auditor). Delete redundant rows for the same user+clinic.
--     We use ctid ordering so it is deterministic and repeatable.
WITH ranked AS (
  SELECT ctid, clinic_id, user_id, role,
         row_number() OVER (
           PARTITION BY clinic_id, user_id
           ORDER BY CASE role
             WHEN 'owner' THEN 1
             WHEN 'admin' THEN 2
             WHEN 'dentist' THEN 3
             WHEN 'hygienist' THEN 4
             WHEN 'assistant' THEN 5
             WHEN 'front_desk' THEN 6
             WHEN 'billing_specialist' THEN 7
             WHEN 'read_only_auditor' THEN 8
           END,
           created_at ASC
         ) AS rn
  FROM public.clinic_members
)
DELETE FROM public.clinic_members cm
USING ranked r
WHERE cm.ctid = r.ctid AND r.rn > 1;

-- 1b. Replace unique(clinic_id, user_id, role) with unique(clinic_id, user_id).
ALTER TABLE public.clinic_members
  DROP CONSTRAINT IF EXISTS clinic_members_clinic_id_user_id_role_key;

ALTER TABLE public.clinic_members
  ADD CONSTRAINT clinic_members_clinic_user_unique UNIQUE (clinic_id, user_id);

-- 1c. Trigger: last-owner + self-promotion + admin-cannot-touch-owner.
--     Only enforced for authenticated caller paths. Service-role bypasses
--     via the JWT claim check so backend maintenance stays possible.
CREATE OR REPLACE FUNCTION public.clinic_members_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Caller must be super_admin OR active owner/admin in the target clinic.
  IF NOT public.is_super_admin(_caller) THEN
    SELECT role INTO _caller_role
      FROM public.clinic_members
     WHERE clinic_id = _clinic AND user_id = _caller AND is_active = true;
    IF _caller_role IS NULL OR _caller_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'not authorized to manage staff for this clinic';
    END IF;

    -- Admin cannot create, promote to, demote, or touch an owner row.
    IF (TG_OP = 'INSERT' AND _new_role = 'owner' AND _caller_role <> 'owner')
       OR (TG_OP = 'UPDATE' AND (_old_role = 'owner' OR _new_role = 'owner')
           AND _caller_role <> 'owner')
       OR (TG_OP = 'DELETE' AND _old_role = 'owner' AND _caller_role <> 'owner')
    THEN
      RAISE EXCEPTION 'admins cannot manage owner memberships';
    END IF;

    -- Self-promotion to owner is never allowed via clinic staff functions.
    IF TG_OP IN ('INSERT','UPDATE') AND _target = _caller
       AND _new_role = 'owner' AND (TG_OP = 'INSERT' OR _old_role <> 'owner')
    THEN
      RAISE EXCEPTION 'cannot promote yourself to owner';
    END IF;
  END IF;

  -- Last-active-owner invariant: applies to everyone, including super_admin,
  -- because a clinic without an owner is unrecoverable.
  IF TG_OP = 'DELETE' AND _old_role = 'owner' AND _old_active = true THEN
    SELECT COUNT(*) INTO _active_owner_count
      FROM public.clinic_members
     WHERE clinic_id = _clinic AND role = 'owner'
       AND is_active = true AND user_id <> _target;
    IF _active_owner_count = 0 THEN
      RAISE EXCEPTION 'cannot remove the last active owner';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND _old_role = 'owner' AND _old_active = true
        AND (_new_role <> 'owner' OR _new_active = false) THEN
    SELECT COUNT(*) INTO _active_owner_count
      FROM public.clinic_members
     WHERE clinic_id = _clinic AND role = 'owner'
       AND is_active = true AND user_id <> _target;
    IF _active_owner_count = 0 THEN
      RAISE EXCEPTION 'cannot demote or deactivate the last active owner';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_clinic_members_guard ON public.clinic_members;
CREATE TRIGGER trg_clinic_members_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.clinic_members
  FOR EACH ROW EXECUTE FUNCTION public.clinic_members_guard();

-- 1d. Tighten the write policy: only active owner/admin (existing policy
--     already limits by role; the trigger enforces the deeper rules).
DROP POLICY IF EXISTS "members managed by owner/admin" ON public.clinic_members;
CREATE POLICY "clinic_members_write_owner_admin"
  ON public.clinic_members
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_clinic_role(auth.uid(), clinic_id,
        ARRAY['owner','admin']::clinic_role[])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_clinic_role(auth.uid(), clinic_id,
        ARRAY['owner','admin']::clinic_role[])
  );

-- ---------------------------------------------------------------------
-- 2. Invitations redesign (forward-only, 0 rows currently).
-- ---------------------------------------------------------------------

-- 2a. Add new columns.
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS clinic_role clinic_role,
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2b. Drop legacy plaintext token + legacy `role app_role` column (0 rows).
ALTER TABLE public.invitations
  DROP COLUMN IF EXISTS token,
  DROP COLUMN IF EXISTS role;

-- 2c. Make new required columns NOT NULL and add token_hash uniqueness.
ALTER TABLE public.invitations
  ALTER COLUMN clinic_role SET NOT NULL,
  ALTER COLUMN token_hash SET NOT NULL;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_token_hash_key UNIQUE (token_hash);

-- 2d. Normalize email + one active invitation per (clinic_id, lower(email)).
CREATE UNIQUE INDEX IF NOT EXISTS invitations_active_email_per_clinic_idx
  ON public.invitations (clinic_id, lower(email))
  WHERE used_at IS NULL AND revoked_at IS NULL;

-- 2e. Column-level SELECT: hide token_hash from Data-API/authenticated.
--     RLS still applies on top. Full column access remains for service_role.
REVOKE SELECT ON public.invitations FROM authenticated;
GRANT SELECT
  (id, clinic_id, email, clinic_role, expires_at, used_at, used_by,
   revoked_at, revoked_by, invited_by, created_at)
  ON public.invitations TO authenticated;

-- Also lock down write paths at the Data API layer; clients must go through
-- the RPCs below. Server functions use context.supabase (authenticated) or
-- service_role, both of which retain what they need via the RPC EXECUTE grant.
REVOKE INSERT, UPDATE, DELETE ON public.invitations FROM authenticated;

DROP POLICY IF EXISTS "clinic members write" ON public.invitations;
DROP POLICY IF EXISTS "clinic members update" ON public.invitations;
DROP POLICY IF EXISTS "clinic members delete" ON public.invitations;
DROP POLICY IF EXISTS "clinic members read" ON public.invitations;

CREATE POLICY "invitations_read_clinic_scope"
  ON public.invitations
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_clinic_role(auth.uid(), clinic_id,
        ARRAY['owner','admin']::clinic_role[])
  );

-- No INSERT/UPDATE/DELETE policies for authenticated: all writes must go
-- through the SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------
-- 3. Clinic staff + invitation RPCs.
-- ---------------------------------------------------------------------

-- 3a. Authorization helper: caller must be active owner/admin of an active
--     clinic. Returns caller's clinic role or raises.
CREATE OR REPLACE FUNCTION public._require_clinic_admin(_clinic_id uuid)
RETURNS clinic_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _clinic_active boolean;
  _role clinic_role;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT is_active INTO _clinic_active FROM public.clinics WHERE id = _clinic_id;
  IF _clinic_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'clinic not found or inactive';
  END IF;

  SELECT role INTO _role
    FROM public.clinic_members
   WHERE clinic_id = _clinic_id AND user_id = _uid AND is_active = true;

  IF _role IS NULL OR _role NOT IN ('owner','admin') THEN
    IF public.is_super_admin(_uid) THEN
      RETURN 'owner'::clinic_role; -- super_admin acts with owner-level scope
    END IF;
    RAISE EXCEPTION 'forbidden: owner or admin membership required';
  END IF;

  RETURN _role;
END;
$$;

REVOKE ALL ON FUNCTION public._require_clinic_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._require_clinic_admin(uuid) TO authenticated, service_role;

-- 3b. list_clinic_staff — clinic-scoped, returns only fields the staff UI
--     needs. Never returns platform_role, memberships in other clinics,
--     invitation tokens, or auth internals.
CREATE OR REPLACE FUNCTION public.list_clinic_staff(_clinic_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role clinic_role,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_clinic_admin(_clinic_id);
  RETURN QUERY
  SELECT cm.user_id, p.full_name, p.email, cm.role, cm.is_active, cm.created_at
    FROM public.clinic_members cm
    LEFT JOIN public.profiles p ON p.id = cm.user_id
   WHERE cm.clinic_id = _clinic_id
   ORDER BY cm.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_clinic_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_clinic_staff(uuid) TO authenticated, service_role;

-- 3c. list_clinic_invitations — never returns token_hash.
CREATE OR REPLACE FUNCTION public.list_clinic_invitations(_clinic_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  clinic_role clinic_role,
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  invited_by uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_clinic_admin(_clinic_id);
  RETURN QUERY
  SELECT i.id, i.email, i.clinic_role, i.expires_at, i.used_at, i.used_by,
         i.revoked_at, i.revoked_by, i.invited_by, i.created_at
    FROM public.invitations i
   WHERE i.clinic_id = _clinic_id
   ORDER BY i.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_clinic_invitations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_clinic_invitations(uuid) TO authenticated, service_role;

-- 3d. create_clinic_invitation — returns raw token exactly once.
CREATE OR REPLACE FUNCTION public.create_clinic_invitation(
  _clinic_id uuid,
  _email text,
  _role clinic_role,
  _expires_at timestamptz DEFAULT now() + interval '7 days'
)
RETURNS TABLE (id uuid, raw_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_role clinic_role;
  _uid uuid := auth.uid();
  _normalized text := lower(trim(_email));
  _raw text;
  _hash text;
  _new_id uuid;
BEGIN
  _caller_role := public._require_clinic_admin(_clinic_id);

  IF _normalized IS NULL OR _normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  IF _role NOT IN ('owner','admin','dentist','hygienist','assistant',
                   'front_desk','billing_specialist','read_only_auditor') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;
  IF _role = 'owner' AND _caller_role <> 'owner' AND NOT public.is_super_admin(_uid) THEN
    RAISE EXCEPTION 'admins cannot issue owner invitations';
  END IF;
  IF _expires_at <= now() OR _expires_at > now() + interval '30 days' THEN
    RAISE EXCEPTION 'invalid expiry';
  END IF;

  -- Revoke any existing active invitation for the same email+clinic.
  UPDATE public.invitations
     SET revoked_at = now(), revoked_by = _uid
   WHERE clinic_id = _clinic_id
     AND lower(email) = _normalized
     AND used_at IS NULL AND revoked_at IS NULL;

  _raw := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_raw, 'sha256'), 'hex');

  INSERT INTO public.invitations
    (clinic_id, email, clinic_role, token_hash, expires_at, invited_by)
  VALUES
    (_clinic_id, _normalized, _role, _hash, _expires_at, _uid)
  RETURNING invitations.id INTO _new_id;

  INSERT INTO public.audit_log (user_id, clinic_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _clinic_id, 'invite.create', 'invitation', _new_id::text,
          jsonb_build_object('email', _normalized, 'role', _role));

  RETURN QUERY SELECT _new_id, _raw;
END;
$$;

REVOKE ALL ON FUNCTION public.create_clinic_invitation(uuid, text, clinic_role, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_clinic_invitation(uuid, text, clinic_role, timestamptz)
  TO authenticated, service_role;

-- 3e. revoke_clinic_invitation — soft revoke, retained for audit.
CREATE OR REPLACE FUNCTION public.revoke_clinic_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clinic uuid;
  _uid uuid := auth.uid();
BEGIN
  SELECT clinic_id INTO _clinic FROM public.invitations WHERE id = _invitation_id;
  IF _clinic IS NULL THEN
    RAISE EXCEPTION 'invitation not found';
  END IF;
  PERFORM public._require_clinic_admin(_clinic);

  UPDATE public.invitations
     SET revoked_at = COALESCE(revoked_at, now()),
         revoked_by = COALESCE(revoked_by, _uid)
   WHERE id = _invitation_id AND used_at IS NULL;

  INSERT INTO public.audit_log (user_id, clinic_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _clinic, 'invite.revoke', 'invitation', _invitation_id::text, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_clinic_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_clinic_invitation(uuid) TO authenticated, service_role;

-- 3f. accept_clinic_invitation — atomic, row-locked.
CREATE OR REPLACE FUNCTION public.accept_clinic_invitation(_raw_token text)
RETURNS TABLE (clinic_id uuid, role clinic_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _hash text;
  _inv record;
  _user_email text;
  _clinic_active boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _raw_token IS NULL OR length(_raw_token) < 16 THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  _hash := encode(extensions.digest(_raw_token, 'sha256'), 'hex');

  -- Lock invitation row for the duration of this transaction.
  SELECT * INTO _inv FROM public.invitations WHERE token_hash = _hash FOR UPDATE;
  IF _inv IS NULL THEN
    RAISE EXCEPTION 'invitation not found';
  END IF;
  IF _inv.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation already used';
  END IF;
  IF _inv.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation revoked';
  END IF;
  IF _inv.expires_at <= now() THEN
    RAISE EXCEPTION 'invitation expired';
  END IF;

  SELECT is_active INTO _clinic_active FROM public.clinics WHERE id = _inv.clinic_id;
  IF _clinic_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'clinic inactive';
  END IF;

  -- Confirmed email from auth.users (never trust client input).
  SELECT lower(u.email) INTO _user_email
    FROM auth.users u
   WHERE u.id = _uid AND u.email_confirmed_at IS NOT NULL;
  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'email not confirmed';
  END IF;
  IF _user_email <> lower(_inv.email) THEN
    RAISE EXCEPTION 'invitation email does not match your account';
  END IF;

  -- Create or reactivate exactly one membership row.
  INSERT INTO public.clinic_members (clinic_id, user_id, role, is_active)
  VALUES (_inv.clinic_id, _uid, _inv.clinic_role, true)
  ON CONFLICT (clinic_id, user_id) DO UPDATE
     SET role = EXCLUDED.role, is_active = true, updated_at = now();

  UPDATE public.invitations
     SET used_at = now(), used_by = _uid
   WHERE id = _inv.id;

  INSERT INTO public.audit_log (user_id, clinic_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _inv.clinic_id, 'invite.accept', 'invitation', _inv.id::text,
          jsonb_build_object('role', _inv.clinic_role));

  RETURN QUERY SELECT _inv.clinic_id, _inv.clinic_role;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_clinic_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_clinic_invitation(text) TO authenticated, service_role;

-- 3g. peek_clinic_invitation — reveals only email + role after server-side
--     validation. Never reveals clinic name or IDs beyond what is safe.
CREATE OR REPLACE FUNCTION public.peek_clinic_invitation(_raw_token text)
RETURNS TABLE (email text, role clinic_role, valid boolean, reason text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
  _inv record;
BEGIN
  IF _raw_token IS NULL OR length(_raw_token) < 16 THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'invalid';
    RETURN;
  END IF;
  _hash := encode(extensions.digest(_raw_token, 'sha256'), 'hex');
  SELECT * INTO _inv FROM public.invitations WHERE token_hash = _hash;
  IF _inv IS NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'not_found';
    RETURN;
  END IF;
  IF _inv.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'used';
    RETURN;
  END IF;
  IF _inv.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'revoked';
    RETURN;
  END IF;
  IF _inv.expires_at <= now() THEN
    RETURN QUERY SELECT NULL::text, NULL::clinic_role, false, 'expired';
    RETURN;
  END IF;
  RETURN QUERY SELECT _inv.email, _inv.clinic_role, true, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.peek_clinic_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_clinic_invitation(text)
  TO anon, authenticated, service_role;

-- 3h. set_clinic_member_role — obeys owner/admin scope + trigger invariants.
CREATE OR REPLACE FUNCTION public.set_clinic_member_role(
  _clinic_id uuid, _user_id uuid, _role clinic_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_role clinic_role;
  _uid uuid := auth.uid();
BEGIN
  _caller_role := public._require_clinic_admin(_clinic_id);
  IF _user_id = _uid AND _role = 'owner' AND _caller_role <> 'owner' THEN
    RAISE EXCEPTION 'cannot promote yourself to owner';
  END IF;

  UPDATE public.clinic_members
     SET role = _role, updated_at = now()
   WHERE clinic_id = _clinic_id AND user_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership not found';
  END IF;

  INSERT INTO public.audit_log (user_id, clinic_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _clinic_id, 'staff.role_change', 'user', _user_id::text,
          jsonb_build_object('role', _role));
END;
$$;

REVOKE ALL ON FUNCTION public.set_clinic_member_role(uuid, uuid, clinic_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_clinic_member_role(uuid, uuid, clinic_role)
  TO authenticated, service_role;

-- 3i. set_clinic_member_active — clinic-scoped, never touches global
--     profiles.is_active.
CREATE OR REPLACE FUNCTION public.set_clinic_member_active(
  _clinic_id uuid, _user_id uuid, _active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  PERFORM public._require_clinic_admin(_clinic_id);

  UPDATE public.clinic_members
     SET is_active = _active, updated_at = now()
   WHERE clinic_id = _clinic_id AND user_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership not found';
  END IF;

  INSERT INTO public.audit_log (user_id, clinic_id, action, entity_type, entity_id, metadata)
  VALUES (_uid, _clinic_id,
          CASE WHEN _active THEN 'staff.activate' ELSE 'staff.deactivate' END,
          'user', _user_id::text, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.set_clinic_member_active(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_clinic_member_active(uuid, uuid, boolean)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. handle_new_user — remove staff-invitation + user_roles branches.
--    Patient-portal auto-linking is intentionally LEFT INTACT and flagged
--    as an unresolved Stage C blocker.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_patient RECORD;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- STAGE C BLOCKER: this auto-links a patient portal user by email match.
  -- It is a P0 finding (patient-data disclosure via account creation) but
  -- fixing it requires the portal invitation redesign in Stage C. It is
  -- explicitly LEFT IN PLACE for this stage per the remediation plan.
  SELECT id, clinic_id INTO matched_patient
    FROM public.patients
   WHERE lower(email) = lower(NEW.email)
   LIMIT 1;
  IF matched_patient.id IS NOT NULL THEN
    INSERT INTO public.patient_portal_users (user_id, patient_id, clinic_id)
    VALUES (NEW.id, matched_patient.id, matched_patient.clinic_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
