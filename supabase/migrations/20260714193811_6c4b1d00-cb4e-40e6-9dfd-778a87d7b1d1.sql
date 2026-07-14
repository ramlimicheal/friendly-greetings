
CREATE TABLE public.tooth_charts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL,
  dentition TEXT NOT NULL DEFAULT 'permanent' CHECK (dentition IN ('permanent','primary')),
  -- Per-surface condition. Values: sound, caries, filling, crown, sealant, veneer
  surface_mesial TEXT NOT NULL DEFAULT 'sound',
  surface_distal TEXT NOT NULL DEFAULT 'sound',
  surface_buccal TEXT NOT NULL DEFAULT 'sound',
  surface_lingual TEXT NOT NULL DEFAULT 'sound',
  surface_occlusal TEXT NOT NULL DEFAULT 'sound',
  -- Whole-tooth condition. Values: present, missing, implant, root_canal, bridge, extract_planned
  tooth_condition TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  chart_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, tooth_number, chart_date)
);

CREATE INDEX idx_tooth_charts_patient ON public.tooth_charts(patient_id, chart_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tooth_charts TO authenticated;
GRANT ALL ON public.tooth_charts TO service_role;

ALTER TABLE public.tooth_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tooth charts"
ON public.tooth_charts FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist','front_desk']::app_role[])
);

CREATE POLICY "Clinical can insert tooth charts"
ON public.tooth_charts FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[])
);

CREATE POLICY "Clinical can update tooth charts"
ON public.tooth_charts FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[])
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[])
);

CREATE POLICY "Clinical can delete tooth charts"
ON public.tooth_charts FOR DELETE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[])
);

CREATE TRIGGER trg_tooth_charts_updated_at
BEFORE UPDATE ON public.tooth_charts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
