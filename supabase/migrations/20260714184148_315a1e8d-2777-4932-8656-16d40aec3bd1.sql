-- Status enum for appointments
CREATE TYPE public.appointment_status AS ENUM (
  'unconfirmed', 'confirmed', 'arrived', 'in-chair', 'completed', 'cancelled', 'no-show'
);

CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  chair SMALLINT NOT NULL CHECK (chair BETWEEN 1 AND 8),
  provider TEXT NOT NULL,
  procedure TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  duration_min SMALLINT NOT NULL CHECK (duration_min BETWEEN 5 AND 480),
  status public.appointment_status NOT NULL DEFAULT 'unconfirmed',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view appointments"
  ON public.appointments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can create appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and dentists can delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dentist'));

CREATE INDEX appointments_start_at_idx ON public.appointments (start_at);
CREATE INDEX appointments_patient_id_idx ON public.appointments (patient_id);

CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime broadcasts for live schedule updates
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;