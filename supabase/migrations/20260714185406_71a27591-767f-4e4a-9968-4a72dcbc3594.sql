-- ============ WAITLIST ============
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  procedure text NOT NULL,
  preferred_provider text,
  preferred_chair int,
  duration_min int NOT NULL DEFAULT 30,
  priority int NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','scheduled','removed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view waitlist" ON public.waitlist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert waitlist" ON public.waitlist FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update waitlist" ON public.waitlist FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can delete waitlist" ON public.waitlist FOR DELETE TO authenticated USING (true);

CREATE TRIGGER waitlist_set_updated_at
BEFORE UPDATE ON public.waitlist
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_waitlist_status ON public.waitlist(status);
CREATE INDEX idx_waitlist_patient ON public.waitlist(patient_id);

-- ============ RECALLS ============
CREATE TABLE public.recalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  procedure text NOT NULL DEFAULT 'Cleaning + exam',
  interval_months int NOT NULL DEFAULT 6 CHECK (interval_months BETWEEN 1 AND 24),
  last_completed_at date,
  next_due_at date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, procedure)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recalls TO authenticated;
GRANT ALL ON public.recalls TO service_role;

ALTER TABLE public.recalls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view recalls" ON public.recalls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert recalls" ON public.recalls FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update recalls" ON public.recalls FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can delete recalls" ON public.recalls FOR DELETE TO authenticated USING (true);

CREATE TRIGGER recalls_set_updated_at
BEFORE UPDATE ON public.recalls
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_recalls_due ON public.recalls(next_due_at) WHERE active;

-- ============ CONFLICT CHECK RPC ============
CREATE OR REPLACE FUNCTION public.check_appointment_conflict(
  _chair int,
  _provider text,
  _start_at timestamptz,
  _duration_min int,
  _exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, patient_id uuid, start_at timestamptz, duration_min int, chair int, provider text, conflict_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.patient_id, a.start_at, a.duration_min, a.chair, a.provider,
    CASE
      WHEN a.chair = _chair AND a.provider = _provider THEN 'chair+provider'
      WHEN a.chair = _chair THEN 'chair'
      ELSE 'provider'
    END AS conflict_type
  FROM public.appointments a
  WHERE a.status NOT IN ('cancelled','no-show')
    AND (_exclude_id IS NULL OR a.id <> _exclude_id)
    AND (a.chair = _chair OR a.provider = _provider)
    AND tstzrange(a.start_at, a.start_at + make_interval(mins => a.duration_min), '[)')
        && tstzrange(_start_at, _start_at + make_interval(mins => _duration_min), '[)');
$$;

GRANT EXECUTE ON FUNCTION public.check_appointment_conflict(int, text, timestamptz, int, uuid) TO authenticated;
