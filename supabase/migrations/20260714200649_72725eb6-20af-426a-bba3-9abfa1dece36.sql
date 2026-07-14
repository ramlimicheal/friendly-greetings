
-- Extend patients with medical info
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS medical_conditions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medications text[] NOT NULL DEFAULT '{}';

-- Fee schedule
CREATE TABLE IF NOT EXISTS public.fee_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  default_fee numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_schedule TO authenticated;
GRANT ALL ON public.fee_schedule TO service_role;
ALTER TABLE public.fee_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read fees" ON public.fee_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage fees" ON public.fee_schedule FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dentist']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dentist']::app_role[]));
CREATE TRIGGER trg_fee_schedule_updated BEFORE UPDATE ON public.fee_schedule
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed common ADA/CDT codes
INSERT INTO public.fee_schedule (code, description, category, default_fee) VALUES
  ('D0120','Periodic oral evaluation','diagnostic',65),
  ('D0150','Comprehensive oral evaluation','diagnostic',110),
  ('D0210','Intraoral - complete series radiographic images','diagnostic',150),
  ('D0220','Intraoral - periapical first radiographic image','diagnostic',35),
  ('D0274','Bitewings - four radiographic images','diagnostic',75),
  ('D1110','Prophylaxis - adult','preventive',110),
  ('D1120','Prophylaxis - child','preventive',85),
  ('D1206','Topical application of fluoride varnish','preventive',45),
  ('D1351','Sealant - per tooth','preventive',60),
  ('D2140','Amalgam - one surface','restorative',150),
  ('D2150','Amalgam - two surfaces','restorative',190),
  ('D2330','Resin-based composite - one surface, anterior','restorative',175),
  ('D2331','Resin-based composite - two surfaces, anterior','restorative',215),
  ('D2391','Resin-based composite - one surface, posterior','restorative',195),
  ('D2392','Resin-based composite - two surfaces, posterior','restorative',245),
  ('D2740','Crown - porcelain/ceramic','restorative',1350),
  ('D2750','Crown - porcelain fused to high noble metal','restorative',1250),
  ('D3220','Therapeutic pulpotomy','endodontic',210),
  ('D3310','Endodontic therapy, anterior tooth','endodontic',900),
  ('D3320','Endodontic therapy, premolar tooth','endodontic',1050),
  ('D3330','Endodontic therapy, molar tooth','endodontic',1275),
  ('D4341','Periodontal scaling and root planing - four or more teeth per quadrant','periodontic',285),
  ('D4910','Periodontal maintenance','periodontic',150),
  ('D6010','Surgical placement of implant body','implant',2200),
  ('D6058','Abutment supported porcelain/ceramic crown','implant',1650),
  ('D7140','Extraction, erupted tooth or exposed root','surgical',220),
  ('D7210','Extraction, erupted tooth requiring removal of bone','surgical',350),
  ('D9110','Palliative treatment of dental pain','other',95),
  ('D9944','Occlusal guard - hard appliance, full arch','other',495)
ON CONFLICT (code) DO NOTHING;

-- Treatment plans
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Treatment plan',
  status text NOT NULL DEFAULT 'draft', -- draft, proposed, accepted, completed, declined
  notes text,
  presented_at date,
  accepted_at date,
  completed_at date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plans TO authenticated;
GRANT ALL ON public.treatment_plans TO service_role;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read plans" ON public.treatment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "clinical write plans" ON public.treatment_plans FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[]));
CREATE TRIGGER trg_treatment_plans_updated BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON public.treatment_plans(patient_id);

-- Plan items
CREATE TABLE IF NOT EXISTS public.treatment_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  phase int NOT NULL DEFAULT 1,
  procedure_code text NOT NULL,
  description text NOT NULL,
  tooth_number int,
  surfaces text,
  fee numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned', -- planned, accepted, completed, declined
  completed_at date,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plan_items TO authenticated;
GRANT ALL ON public.treatment_plan_items TO service_role;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read plan items" ON public.treatment_plan_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "clinical write plan items" ON public.treatment_plan_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[]));
CREATE TRIGGER trg_plan_items_updated BEFORE UPDATE ON public.treatment_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON public.treatment_plan_items(plan_id);

-- Clinical notes (SOAP)
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_date date NOT NULL DEFAULT current_date,
  provider text,
  subjective text,
  objective text,
  assessment text,
  plan text,
  signed_at timestamptz,
  signed_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_notes TO authenticated;
GRANT ALL ON public.clinical_notes TO service_role;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read notes" ON public.clinical_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clinical write notes" ON public.clinical_notes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dentist','hygienist']::app_role[]));
CREATE TRIGGER trg_clinical_notes_updated BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_notes_patient ON public.clinical_notes(patient_id, visit_date DESC);
