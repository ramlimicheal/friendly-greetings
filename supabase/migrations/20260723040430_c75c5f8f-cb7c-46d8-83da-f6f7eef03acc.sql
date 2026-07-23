
-- Same migration as prior attempt, with two fixes in public_list_clinic_services:
--   services.default_fee -> removed (column does not exist)
--   services.is_active   -> services.active

CREATE OR REPLACE FUNCTION public.has_active_clinic_access(
  _clinic_id uuid, _roles clinic_role[]
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
      JOIN public.clinic_members m
        ON m.user_id = p.id AND m.clinic_id = _clinic_id AND m.is_active = true
      JOIN public.clinics c
        ON c.id = _clinic_id AND c.is_active = true
     WHERE p.id = auth.uid()
       AND p.active_clinic_id = _clinic_id
       AND (_roles IS NULL OR m.role = ANY(_roles))
  )
$$;
REVOKE ALL ON FUNCTION public.has_active_clinic_access(uuid, clinic_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_clinic_access(uuid, clinic_role[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_read_clinic(_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_active_clinic_access(_clinic_id, NULL::clinic_role[]) $$;
REVOKE ALL ON FUNCTION public.can_read_clinic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_clinic(uuid) TO authenticated;

DO $$
DECLARE t text; n text;
  legacy_tables text[] := ARRAY[
    'patients','appointments','waitlist','recalls','services',
    'booking_requests','intake_forms','tooth_charts','clinical_notes',
    'treatment_plans','treatment_plan_items','fee_schedule',
    'insurance_plans','patient_insurance','invoices','invoice_items',
    'payments','insurance_claims','claim_items','audit_log',
    'patient_files','communications','clinic_settings'];
  legacy_names text[] := ARRAY[
    'clinic members read','clinic members write','clinic members update','clinic members delete',
    'clinic members read bookings','clinic members update bookings','clinic members delete bookings',
    'clinic members read intake','clinic members update intake','clinic members delete intake',
    'clinic members read services','clinic members write services'];
BEGIN
  FOREACH t IN ARRAY legacy_tables LOOP
    FOREACH n IN ARRAY legacy_names LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', n, t);
    END LOOP;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "public can create booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "public read active services" ON public.services;
REVOKE INSERT ON public.booking_requests FROM anon;
REVOKE SELECT ON public.services FROM anon;

CREATE OR REPLACE FUNCTION public._prevent_clinic_move()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.clinic_id IS DISTINCT FROM OLD.clinic_id THEN
    RAISE EXCEPTION 'clinic_id is immutable'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public._force_actor_created_by()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN NEW.created_by := _uid;
  ELSIF TG_OP='UPDATE' AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public._force_uploaded_by()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _uid uuid := auth.uid();
BEGIN IF _uid IS NOT NULL AND TG_OP='INSERT' THEN NEW.uploaded_by := _uid; END IF; RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public._force_sent_by()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _uid uuid := auth.uid();
BEGIN IF _uid IS NOT NULL AND TG_OP='INSERT' THEN NEW.sent_by := _uid; END IF; RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public._force_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _uid uuid := auth.uid();
BEGIN IF _uid IS NOT NULL AND TG_OP='INSERT' THEN NEW.user_id := _uid; END IF; RETURN NEW; END $$;

DO $$
DECLARE t text; tables text[] := ARRAY[
  'patients','appointments','waitlist','recalls','services',
  'booking_requests','intake_forms','tooth_charts','clinical_notes',
  'treatment_plans','treatment_plan_items','fee_schedule',
  'insurance_plans','patient_insurance','invoices','invoice_items',
  'payments','insurance_claims','claim_items','audit_log',
  'patient_files','communications','clinic_settings'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_clinic_immutable ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_clinic_immutable BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public._prevent_clinic_move()', t, t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_patients_created_by ON public.patients;
CREATE TRIGGER trg_patients_created_by BEFORE INSERT OR UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public._force_actor_created_by();
DROP TRIGGER IF EXISTS trg_clinical_notes_created_by ON public.clinical_notes;
CREATE TRIGGER trg_clinical_notes_created_by BEFORE INSERT OR UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public._force_actor_created_by();
DROP TRIGGER IF EXISTS trg_treatment_plans_created_by ON public.treatment_plans;
CREATE TRIGGER trg_treatment_plans_created_by BEFORE INSERT OR UPDATE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public._force_actor_created_by();
DROP TRIGGER IF EXISTS trg_invoices_created_by ON public.invoices;
CREATE TRIGGER trg_invoices_created_by BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public._force_actor_created_by();
DROP TRIGGER IF EXISTS trg_payments_created_by ON public.payments;
CREATE TRIGGER trg_payments_created_by BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public._force_actor_created_by();
DROP TRIGGER IF EXISTS trg_claims_created_by ON public.insurance_claims;
CREATE TRIGGER trg_claims_created_by BEFORE INSERT OR UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION public._force_actor_created_by();
DROP TRIGGER IF EXISTS trg_files_uploaded_by ON public.patient_files;
CREATE TRIGGER trg_files_uploaded_by BEFORE INSERT ON public.patient_files
  FOR EACH ROW EXECUTE FUNCTION public._force_uploaded_by();
DROP TRIGGER IF EXISTS trg_comm_sent_by ON public.communications;
CREATE TRIGGER trg_comm_sent_by BEFORE INSERT ON public.communications
  FOR EACH ROW EXECUTE FUNCTION public._force_sent_by();
DROP TRIGGER IF EXISTS trg_audit_user_id ON public.audit_log;
CREATE TRIGGER trg_audit_user_id BEFORE INSERT ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public._force_user_id();

CREATE OR REPLACE FUNCTION public._patients_field_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _role clinic_role;
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  SELECT role INTO _role FROM public.clinic_members
    WHERE user_id=_uid AND clinic_id=NEW.clinic_id AND is_active=true;
  IF _role='front_desk' AND TG_OP='UPDATE' THEN
    IF NEW.allergies IS DISTINCT FROM OLD.allergies
    OR NEW.medications IS DISTINCT FROM OLD.medications
    OR NEW.medical_conditions IS DISTINCT FROM OLD.medical_conditions THEN
      RAISE EXCEPTION 'front_desk cannot modify medical fields';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_patients_field_guard ON public.patients;
CREATE TRIGGER trg_patients_field_guard BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public._patients_field_guard();

CREATE OR REPLACE FUNCTION public._clinical_notes_sign_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _role clinic_role;
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  SELECT role INTO _role FROM public.clinic_members
    WHERE user_id=_uid AND clinic_id=NEW.clinic_id AND is_active=true;
  IF TG_OP='UPDATE' AND OLD.signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'signed clinical notes are immutable'; END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.signed_at IS NOT NULL THEN
    IF _role IS NULL OR _role NOT IN ('owner','admin','dentist') THEN
      RAISE EXCEPTION 'only owner/admin/dentist may sign clinical notes'; END IF;
    NEW.signed_by := _uid;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_clinical_notes_sign ON public.clinical_notes;
CREATE TRIGGER trg_clinical_notes_sign BEFORE INSERT OR UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public._clinical_notes_sign_guard();

CREATE OR REPLACE FUNCTION public._clinical_notes_delete_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'signed clinical notes cannot be deleted'; END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_clinical_notes_del ON public.clinical_notes;
CREATE TRIGGER trg_clinical_notes_del BEFORE DELETE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public._clinical_notes_delete_guard();

CREATE OR REPLACE FUNCTION public._treatment_plans_state_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _role clinic_role;
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  SELECT role INTO _role FROM public.clinic_members
    WHERE user_id=_uid AND clinic_id=NEW.clinic_id AND is_active=true;
  IF _role='assistant' AND TG_OP='UPDATE' THEN
    IF (NEW.accepted_at IS DISTINCT FROM OLD.accepted_at)
    OR (NEW.completed_at IS DISTINCT FROM OLD.completed_at)
    OR (NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('accepted','completed','presented')) THEN
      RAISE EXCEPTION 'assistants cannot finalize treatment plans';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tp_state ON public.treatment_plans;
CREATE TRIGGER trg_tp_state BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public._treatment_plans_state_guard();

CREATE OR REPLACE FUNCTION public._invoice_delete_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'only draft invoices may be deleted'; END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_invoice_del ON public.invoices;
CREATE TRIGGER trg_invoice_del BEFORE DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public._invoice_delete_guard();

CREATE OR REPLACE FUNCTION public._payment_delete_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'posted payments cannot be deleted; issue a refund entry'; END $$;
DROP TRIGGER IF EXISTS trg_payment_del ON public.payments;
CREATE TRIGGER trg_payment_del BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public._payment_delete_guard();

CREATE OR REPLACE FUNCTION public._audit_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only'; END $$;
DROP TRIGGER IF EXISTS trg_audit_no_update ON public.audit_log;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public._audit_immutable();
DROP TRIGGER IF EXISTS trg_audit_no_delete ON public.audit_log;
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public._audit_immutable();

CREATE OR REPLACE FUNCTION public._install_clinic_policies(
  _table text,
  _select_roles clinic_role[],
  _insert_roles clinic_role[],
  _update_roles clinic_role[],
  _delete_roles clinic_role[]
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE _r text;
BEGIN
  FOREACH _r IN ARRAY ARRAY['sel','ins','upd','del'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS staged_%s_%I ON public.%I', _r, _table, _table);
  END LOOP;
  IF _select_roles IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY staged_sel_%I ON public.%I FOR SELECT TO authenticated '
      'USING (public.has_active_clinic_access(clinic_id, %L::clinic_role[]))',
      _table, _table, _select_roles);
  END IF;
  IF _insert_roles IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY staged_ins_%I ON public.%I FOR INSERT TO authenticated '
      'WITH CHECK (public.has_active_clinic_access(clinic_id, %L::clinic_role[]))',
      _table, _table, _insert_roles);
  END IF;
  IF _update_roles IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY staged_upd_%I ON public.%I FOR UPDATE TO authenticated '
      'USING (public.has_active_clinic_access(clinic_id, %L::clinic_role[])) '
      'WITH CHECK (public.has_active_clinic_access(clinic_id, %L::clinic_role[]))',
      _table, _table, _update_roles, _update_roles);
  END IF;
  IF _delete_roles IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY staged_del_%I ON public.%I FOR DELETE TO authenticated '
      'USING (public.has_active_clinic_access(clinic_id, %L::clinic_role[]))',
      _table, _table, _delete_roles);
  END IF;
END $$;

SELECT public._install_clinic_policies('patients',
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','front_desk']::clinic_role[],
  ARRAY['owner','admin','front_desk','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('appointments',
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','front_desk','dentist','hygienist','assistant']::clinic_role[],
  ARRAY['owner','admin','front_desk','dentist','hygienist','assistant']::clinic_role[],
  ARRAY['owner','admin','front_desk']::clinic_role[]);
SELECT public._install_clinic_policies('waitlist',
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','front_desk','dentist','hygienist','assistant']::clinic_role[],
  ARRAY['owner','admin','front_desk','dentist','hygienist','assistant']::clinic_role[],
  ARRAY['owner','admin','front_desk']::clinic_role[]);
SELECT public._install_clinic_policies('recalls',
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','front_desk','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin','front_desk','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin','front_desk']::clinic_role[]);
SELECT public._install_clinic_policies('services',
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('fee_schedule',
  ARRAY['owner','admin','dentist','hygienist','front_desk','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('booking_requests',
  ARRAY['owner','admin','front_desk','read_only_auditor']::clinic_role[],
  NULL,
  ARRAY['owner','admin','front_desk']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('intake_forms',
  ARRAY['owner','admin','dentist','hygienist','front_desk','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','front_desk','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin','front_desk','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('tooth_charts',
  ARRAY['owner','admin','dentist','hygienist','assistant','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('clinical_notes',
  ARRAY['owner','admin','dentist','hygienist','assistant','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist','assistant']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('treatment_plans',
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist','assistant']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('treatment_plan_items',
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist','assistant']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist']::clinic_role[]);
SELECT public._install_clinic_policies('insurance_plans',
  ARRAY['owner','admin','dentist','front_desk','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','front_desk','billing_specialist']::clinic_role[],
  ARRAY['owner','admin','front_desk','billing_specialist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('patient_insurance',
  ARRAY['owner','admin','dentist','front_desk','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','front_desk','billing_specialist']::clinic_role[],
  ARRAY['owner','admin','front_desk','billing_specialist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('invoices',
  ARRAY['owner','admin','billing_specialist','front_desk','dentist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','billing_specialist','front_desk']::clinic_role[],
  ARRAY['owner','admin','billing_specialist','front_desk']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[]);
SELECT public._install_clinic_policies('invoice_items',
  ARRAY['owner','admin','billing_specialist','front_desk','dentist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','billing_specialist','front_desk']::clinic_role[],
  ARRAY['owner','admin','billing_specialist','front_desk']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[]);
SELECT public._install_clinic_policies('payments',
  ARRAY['owner','admin','billing_specialist','front_desk','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','billing_specialist','front_desk']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[],
  NULL);
SELECT public._install_clinic_policies('insurance_claims',
  ARRAY['owner','admin','billing_specialist','front_desk','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('claim_items',
  ARRAY['owner','admin','billing_specialist','front_desk','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[],
  ARRAY['owner','admin','billing_specialist']::clinic_role[]);
SELECT public._install_clinic_policies('audit_log',
  ARRAY['owner','admin','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist']::clinic_role[],
  NULL, NULL);
SELECT public._install_clinic_policies('patient_files',
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist']::clinic_role[],
  ARRAY['owner','admin','dentist','hygienist','front_desk','billing_specialist']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('communications',
  ARRAY['owner','admin','front_desk','dentist','hygienist','billing_specialist','read_only_auditor']::clinic_role[],
  ARRAY['owner','admin','front_desk']::clinic_role[],
  ARRAY['owner','admin','front_desk']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);
SELECT public._install_clinic_policies('clinic_settings',
  ARRAY['owner','admin']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[],
  ARRAY['owner','admin']::clinic_role[]);

CREATE OR REPLACE FUNCTION public.public_list_clinic_services(_slug text)
RETURNS TABLE(id uuid, name text, description text, duration_min int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.name, s.description, s.duration_min
    FROM public.services s
    JOIN public.clinics c ON c.id = s.clinic_id
   WHERE c.slug = _slug AND c.is_active = true AND s.active = true
   ORDER BY s.name
$$;
REVOKE ALL ON FUNCTION public.public_list_clinic_services(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_list_clinic_services(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_booking_request(
  _clinic_slug text, _patient_name text, _email text, _phone text,
  _preferred_at timestamptz, _reason text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _clinic uuid; _id uuid;
BEGIN
  IF _patient_name IS NULL OR length(trim(_patient_name)) < 2 THEN
    RAISE EXCEPTION 'invalid name'; END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email'; END IF;
  IF _preferred_at IS NULL OR _preferred_at < now() THEN
    RAISE EXCEPTION 'invalid preferred time'; END IF;
  SELECT id INTO _clinic FROM public.clinics
    WHERE slug = _clinic_slug AND is_active = true;
  IF _clinic IS NULL THEN RAISE EXCEPTION 'clinic not found'; END IF;
  INSERT INTO public.booking_requests
    (clinic_id, patient_name, email, phone, preferred_at, reason, status)
  VALUES (_clinic, trim(_patient_name), lower(trim(_email)),
          nullif(trim(_phone),''), _preferred_at, nullif(trim(_reason),''),
          'pending')
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.submit_booking_request(text,text,text,text,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_booking_request(text,text,text,text,timestamptz,text) TO anon, authenticated;

DROP POLICY IF EXISTS "Clinic members can read own clinic files"    ON storage.objects;
DROP POLICY IF EXISTS "Clinic members can upload to own clinic"     ON storage.objects;
DROP POLICY IF EXISTS "Clinic members can update own clinic files"  ON storage.objects;
DROP POLICY IF EXISTS "Clinic members can delete own clinic files"  ON storage.objects;

CREATE POLICY "clinic-files read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='clinic-files' AND public.has_active_clinic_access(
    (split_part(name,'/',1))::uuid, NULL::clinic_role[]));
CREATE POLICY "clinic-files insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='clinic-files' AND public.has_active_clinic_access(
    (split_part(name,'/',1))::uuid,
    ARRAY['owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist']::clinic_role[]));
CREATE POLICY "clinic-files update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='clinic-files' AND public.has_active_clinic_access(
    (split_part(name,'/',1))::uuid,
    ARRAY['owner','admin','dentist','hygienist','front_desk','billing_specialist']::clinic_role[]));
CREATE POLICY "clinic-files delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='clinic-files' AND public.has_active_clinic_access(
    (split_part(name,'/',1))::uuid,
    ARRAY['owner','admin']::clinic_role[]));

CREATE OR REPLACE FUNCTION public.platform_clinic_stats(_clinic_ids uuid[])
RETURNS TABLE(clinic_id uuid, member_count bigint,
              patient_count bigint, appointment_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT c.id,
      (SELECT count(*) FROM public.clinic_members m
        WHERE m.clinic_id = c.id AND m.is_active = true),
      (SELECT count(*) FROM public.patients WHERE clinic_id = c.id),
      (SELECT count(*) FROM public.appointments WHERE clinic_id = c.id)
    FROM public.clinics c
    WHERE c.id = ANY(_clinic_ids);
END $$;
REVOKE ALL ON FUNCTION public.platform_clinic_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_clinic_stats(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public._enforce_same_clinic_via_patient()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE _pc uuid;
BEGIN
  SELECT clinic_id INTO _pc FROM public.patients WHERE id = NEW.patient_id;
  IF _pc IS NULL THEN RAISE EXCEPTION 'patient not found'; END IF;
  IF _pc <> NEW.clinic_id THEN
    RAISE EXCEPTION 'patient % is not in clinic %', NEW.patient_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text; tables text[] := ARRAY[
  'appointments','waitlist','recalls','tooth_charts','clinical_notes',
  'treatment_plans','patient_insurance','invoices','payments',
  'insurance_claims','communications','patient_files'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_same_clinic ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_same_clinic BEFORE INSERT OR UPDATE ON public.%I '
      'FOR EACH ROW WHEN (NEW.patient_id IS NOT NULL) '
      'EXECUTE FUNCTION public._enforce_same_clinic_via_patient()', t, t);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public._install_clinic_policies(text, clinic_role[], clinic_role[], clinic_role[], clinic_role[]);
