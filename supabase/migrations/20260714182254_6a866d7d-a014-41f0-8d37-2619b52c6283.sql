
CREATE TYPE public.patient_status AS ENUM ('Active', 'Recall', 'Overdue', 'New');
CREATE TYPE public.patient_sex AS ENUM ('F', 'M', 'Other');

CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  sex public.patient_sex,
  phone TEXT,
  email TEXT,
  insurance TEXT,
  status public.patient_status NOT NULL DEFAULT 'New',
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  primary_dentist TEXT,
  address TEXT,
  notes TEXT,
  last_visit_at TIMESTAMPTZ,
  next_visit_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view patients"
  ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create patients"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can update patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "Admins and dentists can delete patients"
  ON public.patients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dentist'));

CREATE TRIGGER patients_set_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX patients_full_name_idx ON public.patients (lower(full_name));
CREATE INDEX patients_chart_no_idx ON public.patients (chart_no);
CREATE INDEX patients_status_idx ON public.patients (status);

-- Auto-generate chart number if not supplied (EN-1000, EN-1001, ...)
CREATE SEQUENCE public.patients_chart_seq START WITH 1024;

CREATE OR REPLACE FUNCTION public.set_patient_chart_no()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.chart_no IS NULL OR NEW.chart_no = '' THEN
    NEW.chart_no := 'EN-' || nextval('public.patients_chart_seq');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_patient_chart_no() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER patients_chart_no
  BEFORE INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_patient_chart_no();
