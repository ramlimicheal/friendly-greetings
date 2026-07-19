
-- Patient portal link table
CREATE TABLE public.patient_portal_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_users_patient ON public.patient_portal_users(patient_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_portal_users TO authenticated;
GRANT ALL ON public.patient_portal_users TO service_role;

ALTER TABLE public.patient_portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portal users can read own link"
  ON public.patient_portal_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Clinic staff can view portal links"
  ON public.patient_portal_users FOR SELECT TO authenticated
  USING (public.is_clinic_member(auth.uid(), clinic_id));

-- Helper: return the patient_id for the current logged-in portal user
CREATE OR REPLACE FUNCTION public.current_portal_patient_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT patient_id FROM public.patient_portal_users WHERE user_id = auth.uid()
$$;

-- Extend handle_new_user to also auto-link a portal user by email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  user_count int;
  invited_role public.app_role;
  invitation_id uuid;
  matched_patient RECORD;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  SELECT id, role INTO invitation_id, invited_role
  FROM public.invitations
  WHERE lower(email) = lower(NEW.email)
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF invited_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invited_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.invitations SET used_at = now() WHERE id = invitation_id;
  ELSE
    SELECT COUNT(*) INTO user_count FROM public.user_roles;
    IF user_count = 0 THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      -- No staff role: try to link as patient portal user by matching email
      SELECT id, clinic_id INTO matched_patient
      FROM public.patients
      WHERE lower(email) = lower(NEW.email)
      LIMIT 1;
      IF matched_patient.id IS NOT NULL THEN
        INSERT INTO public.patient_portal_users (user_id, patient_id, clinic_id)
        VALUES (NEW.id, matched_patient.id, matched_patient.clinic_id)
        ON CONFLICT (user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Portal RLS: patients read their own data
CREATE POLICY "Portal: patient reads own record"
  ON public.patients FOR SELECT TO authenticated
  USING (id = public.current_portal_patient_id());

CREATE POLICY "Portal: patient reads own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (patient_id = public.current_portal_patient_id());

CREATE POLICY "Portal: patient reads own treatment plans"
  ON public.treatment_plans FOR SELECT TO authenticated
  USING (patient_id = public.current_portal_patient_id());

CREATE POLICY "Portal: patient reads own plan items"
  ON public.treatment_plan_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    WHERE tp.id = treatment_plan_items.plan_id
      AND tp.patient_id = public.current_portal_patient_id()
  ));

CREATE POLICY "Portal: patient reads own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (patient_id = public.current_portal_patient_id());

CREATE POLICY "Portal: patient reads own invoice items"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
      AND i.patient_id = public.current_portal_patient_id()
  ));

CREATE POLICY "Portal: patient reads own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (patient_id = public.current_portal_patient_id());
