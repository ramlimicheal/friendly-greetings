
-- ==================== INSURANCE PLANS ====================
CREATE TABLE public.insurance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_name TEXT NOT NULL,
  plan_name TEXT,
  group_number TEXT,
  annual_maximum NUMERIC(10,2) NOT NULL DEFAULT 1500,
  deductible NUMERIC(10,2) NOT NULL DEFAULT 50,
  preventive_pct INTEGER NOT NULL DEFAULT 100,
  basic_pct INTEGER NOT NULL DEFAULT 80,
  major_pct INTEGER NOT NULL DEFAULT 50,
  ortho_pct INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_plans TO authenticated;
GRANT ALL ON public.insurance_plans TO service_role;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read plans" ON public.insurance_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage plans" ON public.insurance_plans FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role]));
CREATE TRIGGER trg_insurance_plans_updated BEFORE UPDATE ON public.insurance_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== PATIENT INSURANCE ====================
CREATE TABLE public.patient_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.insurance_plans(id) ON DELETE RESTRICT,
  member_id TEXT,
  subscriber_name TEXT,
  relationship TEXT NOT NULL DEFAULT 'self',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  benefits_used NUMERIC(10,2) NOT NULL DEFAULT 0,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_patient_insurance_patient ON public.patient_insurance(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_insurance TO authenticated;
GRANT ALL ON public.patient_insurance TO service_role;
ALTER TABLE public.patient_insurance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read patient insurance" ON public.patient_insurance FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage patient insurance" ON public.patient_insurance FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_patient_insurance_updated BEFORE UPDATE ON public.patient_insurance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== INVOICES ====================
CREATE SEQUENCE IF NOT EXISTS public.invoices_number_seq START 1001;
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  insurance_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  patient_portion NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "billing manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role, 'dentist'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role, 'dentist'::app_role]));
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_invoice_no()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'INV-' || nextval('public.invoices_number_seq');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invoices_set_no BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_invoice_no();

-- ==================== INVOICE ITEMS ====================
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  procedure_code TEXT NOT NULL,
  description TEXT NOT NULL,
  tooth_number INTEGER,
  surfaces TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  insurance_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  patient_portion NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "billing manage invoice items" ON public.invoice_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role, 'dentist'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role, 'dentist'::app_role]));
CREATE TRIGGER trg_invoice_items_updated BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== PAYMENTS ====================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  received_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_patient ON public.payments(patient_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "billing manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role]));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== INSURANCE CLAIMS ====================
CREATE SEQUENCE IF NOT EXISTS public.claims_number_seq START 5001;
CREATE TABLE public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_no TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.insurance_plans(id) ON DELETE SET NULL,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  billed_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  allowed_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  submitted_at DATE,
  paid_at DATE,
  diagnosis TEXT,
  narrative TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_claims_patient ON public.insurance_claims(patient_id);
CREATE INDEX idx_claims_status ON public.insurance_claims(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_claims TO authenticated;
GRANT ALL ON public.insurance_claims TO service_role;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read claims" ON public.insurance_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "billing manage claims" ON public.insurance_claims FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role, 'dentist'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role, 'dentist'::app_role]));
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON public.insurance_claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_claim_no()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.claim_no IS NULL OR NEW.claim_no = '' THEN
    NEW.claim_no := 'CLM-' || nextval('public.claims_number_seq');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER claims_set_no BEFORE INSERT ON public.insurance_claims FOR EACH ROW EXECUTE FUNCTION public.set_claim_no();

-- ==================== CLAIM ITEMS ====================
CREATE TABLE public.claim_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  procedure_code TEXT NOT NULL,
  description TEXT NOT NULL,
  tooth_number INTEGER,
  surfaces TEXT,
  service_date DATE,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_claim_items_claim ON public.claim_items(claim_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_items TO authenticated;
GRANT ALL ON public.claim_items TO service_role;
ALTER TABLE public.claim_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read claim items" ON public.claim_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "billing manage claim items" ON public.claim_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role, 'dentist'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'front_desk'::app_role, 'dentist'::app_role]));
CREATE TRIGGER trg_claim_items_updated BEFORE UPDATE ON public.claim_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed a couple of common insurance plans for immediate use
INSERT INTO public.insurance_plans (payer_name, plan_name, annual_maximum, deductible, preventive_pct, basic_pct, major_pct, ortho_pct)
VALUES
  ('Delta Dental', 'PPO Premier', 1500, 50, 100, 80, 50, 50),
  ('Cigna', 'DPPO Advantage', 2000, 50, 100, 80, 50, 50),
  ('MetLife', 'PDP Plus', 1500, 75, 100, 80, 50, 0),
  ('Aetna', 'Dental PPO', 1500, 50, 100, 80, 50, 50),
  ('Self-Pay', 'No insurance', 0, 0, 0, 0, 0, 0);
