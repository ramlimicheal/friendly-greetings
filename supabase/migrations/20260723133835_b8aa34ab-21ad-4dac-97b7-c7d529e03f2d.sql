-- 1. Drop overlapping legacy policies that bypass the staged role matrix
DROP POLICY IF EXISTS "Clinic members can view patient files"   ON public.patient_files;
DROP POLICY IF EXISTS "Clinic members can insert patient files" ON public.patient_files;
DROP POLICY IF EXISTS "Clinic members can update patient files" ON public.patient_files;
DROP POLICY IF EXISTS "Clinic members can delete patient files" ON public.patient_files;

DROP POLICY IF EXISTS "Clinic members can view comms"           ON public.communications;
DROP POLICY IF EXISTS "Clinic members can insert comms"         ON public.communications;
DROP POLICY IF EXISTS "Clinic members can update comms"         ON public.communications;
DROP POLICY IF EXISTS "Clinic members can delete comms"         ON public.communications;

DROP POLICY IF EXISTS "Members can view settings"               ON public.clinic_settings;
DROP POLICY IF EXISTS "Admins can modify settings"              ON public.clinic_settings;
DROP POLICY IF EXISTS "Admins can update settings"              ON public.clinic_settings;

-- 2. Sequence grants — trigger-generated numbers run as invoker
GRANT USAGE, SELECT, UPDATE ON SEQUENCE
  public.invoices_number_seq,
  public.claims_number_seq,
  public.patients_chart_seq
TO authenticated;

-- 3. Repair submit_booking_request to match current booking_requests schema
CREATE OR REPLACE FUNCTION public.submit_booking_request(
  _clinic_slug text,
  _patient_name text,
  _email text,
  _phone text,
  _preferred_at timestamptz,
  _reason text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _clinic uuid; _id uuid; _phone_norm text;
BEGIN
  IF _patient_name IS NULL OR length(trim(_patient_name)) < 2 THEN
    RAISE EXCEPTION 'invalid name';
  END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  IF _preferred_at IS NULL OR _preferred_at < now() THEN
    RAISE EXCEPTION 'invalid preferred time';
  END IF;
  _phone_norm := COALESCE(nullif(trim(_phone), ''), '');
  IF length(_phone_norm) = 0 THEN
    RAISE EXCEPTION 'invalid phone';
  END IF;

  SELECT id INTO _clinic
    FROM public.clinics
    WHERE slug = _clinic_slug AND is_active = true;
  IF _clinic IS NULL THEN
    RAISE EXCEPTION 'clinic not found';
  END IF;

  INSERT INTO public.booking_requests
    (clinic_id, full_name, email, phone,
     preferred_date, preferred_time,
     reason, status, is_new_patient)
  VALUES
    (_clinic,
     trim(_patient_name),
     lower(trim(_email)),
     _phone_norm,
     (_preferred_at AT TIME ZONE 'UTC')::date,
     (_preferred_at AT TIME ZONE 'UTC')::time,
     nullif(trim(_reason), ''),
     'pending',
     true)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_booking_request(text,text,text,text,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_booking_request(text,text,text,text,timestamptz,text) TO anon, authenticated;
