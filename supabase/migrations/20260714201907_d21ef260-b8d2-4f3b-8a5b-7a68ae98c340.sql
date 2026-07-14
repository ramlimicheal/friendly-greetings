
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_min int NOT NULL DEFAULT 30,
  default_provider text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active services" ON public.services
  FOR SELECT USING (active = true);
CREATE POLICY "Staff view all services" ON public.services
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage services" ON public.services
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','front_desk']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','front_desk']::app_role[]));
CREATE TRIGGER services_set_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  date_of_birth date,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  preferred_provider text,
  preferred_date date NOT NULL,
  preferred_time time NOT NULL,
  reason text,
  is_new_patient boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.booking_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit booking requests" ON public.booking_requests
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can submit booking requests" ON public.booking_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff view booking requests" ON public.booking_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff update booking requests" ON public.booking_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/front-desk delete booking requests" ON public.booking_requests
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','front_desk']::app_role[]));
CREATE TRIGGER booking_requests_set_updated_at BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX booking_requests_status_idx ON public.booking_requests(status, created_at DESC);

CREATE TABLE public.intake_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  date_of_birth date,
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  allergies text[] NOT NULL DEFAULT '{}',
  medical_conditions text[] NOT NULL DEFAULT '{}',
  medications text[] NOT NULL DEFAULT '{}',
  insurance_carrier text,
  insurance_member_id text,
  insurance_group text,
  consent_treatment boolean NOT NULL DEFAULT false,
  consent_privacy boolean NOT NULL DEFAULT false,
  signature text,
  signed_at timestamptz,
  status text NOT NULL DEFAULT 'submitted',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.intake_forms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_forms TO authenticated;
GRANT ALL ON public.intake_forms TO service_role;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit intake forms" ON public.intake_forms
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can submit intake forms" ON public.intake_forms
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff view intake forms" ON public.intake_forms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff update intake forms" ON public.intake_forms
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin/front-desk delete intake forms" ON public.intake_forms
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','front_desk']::app_role[]));
CREATE TRIGGER intake_forms_set_updated_at BEFORE UPDATE ON public.intake_forms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX intake_forms_status_idx ON public.intake_forms(status, created_at DESC);

INSERT INTO public.services (name, description, duration_min, default_provider, sort_order) VALUES
  ('New patient exam', 'Comprehensive exam, X-rays, and cleaning', 60, 'Dr. Patel', 1),
  ('Routine cleaning', 'Prophylaxis and periodic exam', 45, 'Dr. Patel', 2),
  ('Emergency visit', 'Same-day evaluation for pain or trauma', 30, 'Dr. Kim', 3),
  ('Filling', 'Composite restoration', 45, 'Dr. Patel', 4),
  ('Whitening consult', 'Cosmetic consultation and shade selection', 30, 'Dr. Kim', 5);
