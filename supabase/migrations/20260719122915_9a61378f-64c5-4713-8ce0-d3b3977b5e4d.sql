
-- ============================================================
-- S1.1  Multi-tenant foundation
-- ============================================================

-- 1. Platform role enum
CREATE TYPE public.platform_role AS ENUM ('super_admin', 'support_agent');

-- 2. Clinic role enum (expanded)
CREATE TYPE public.clinic_role AS ENUM (
  'owner','admin','dentist','hygienist','assistant',
  'front_desk','billing_specialist','read_only_auditor'
);

-- 3. Organizations (a group can own multiple clinics)
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 4. Clinics
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  timezone text NOT NULL DEFAULT 'UTC',
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  phone text,
  email text,
  chair_count int NOT NULL DEFAULT 4,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.clinics(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- 5. Clinic members (user ↔ clinic ↔ role)
CREATE TABLE public.clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.clinic_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id, role)
);
CREATE INDEX ON public.clinic_members(user_id);
CREATE INDEX ON public.clinic_members(clinic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- 6. Extend profiles for platform role + active clinic
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS platform_role public.platform_role,
  ADD COLUMN IF NOT EXISTS active_clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;

-- 7. Helper functions (SECURITY DEFINER, avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND platform_role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT active_clinic_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_member(_user_id uuid, _clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = _user_id AND clinic_id = _clinic_id AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.has_clinic_role(_user_id uuid, _clinic_id uuid, _roles public.clinic_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = _user_id
      AND clinic_id = _clinic_id
      AND is_active = true
      AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_current_clinic()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(auth.uid())
      OR public.is_clinic_member(auth.uid(), public.current_clinic_id())
$$;

-- 8. RLS on the new tables
CREATE POLICY "org visible to members or super admin" ON public.organizations
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.clinics c
      JOIN public.clinic_members m ON m.clinic_id = c.id
      WHERE c.organization_id = organizations.id AND m.user_id = auth.uid()
    )
  );
CREATE POLICY "org insert by any authenticated" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "org update by super admin" ON public.organizations
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "clinic visible to members or super admin" ON public.clinics
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.is_clinic_member(auth.uid(), id)
  );
CREATE POLICY "clinic insert by super admin or owner" ON public.clinics
  FOR INSERT TO authenticated WITH CHECK (
    public.is_super_admin(auth.uid()) OR auth.uid() IS NOT NULL
  );
CREATE POLICY "clinic update by clinic owner/admin or super admin" ON public.clinics
  FOR UPDATE TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.has_clinic_role(auth.uid(), id, ARRAY['owner','admin']::public.clinic_role[])
  );

CREATE POLICY "members visible to same clinic members" ON public.clinic_members
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.is_clinic_member(auth.uid(), clinic_id)
    OR user_id = auth.uid()
  );
CREATE POLICY "members managed by owner/admin" ON public.clinic_members
  FOR ALL TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.has_clinic_role(auth.uid(), clinic_id, ARRAY['owner','admin']::public.clinic_role[])
  ) WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_clinic_role(auth.uid(), clinic_id, ARRAY['owner','admin']::public.clinic_role[])
  );

-- 9. Backfill: Default Organization + Default Clinic
DO $$
DECLARE
  v_org_id uuid;
  v_clinic_id uuid;
  v_first_admin uuid;
BEGIN
  INSERT INTO public.organizations (name, slug)
  VALUES ('Default Organization','default')
  RETURNING id INTO v_org_id;

  INSERT INTO public.clinics (organization_id, name, slug, timezone, chair_count)
  VALUES (v_org_id, 'Default Clinic', 'default', 'UTC', 4)
  RETURNING id INTO v_clinic_id;

  -- Migrate existing user_roles → clinic_members in the Default Clinic
  INSERT INTO public.clinic_members (clinic_id, user_id, role)
  SELECT v_clinic_id, ur.user_id,
    CASE ur.role::text
      WHEN 'admin' THEN 'admin'::public.clinic_role
      WHEN 'dentist' THEN 'dentist'::public.clinic_role
      WHEN 'hygienist' THEN 'hygienist'::public.clinic_role
      WHEN 'front_desk' THEN 'front_desk'::public.clinic_role
      ELSE 'front_desk'::public.clinic_role
    END
  FROM public.user_roles ur
  ON CONFLICT DO NOTHING;

  -- Promote the first existing admin to clinic owner + platform super_admin
  SELECT user_id INTO v_first_admin
  FROM public.user_roles WHERE role::text = 'admin'
  ORDER BY created_at NULLS LAST LIMIT 1;

  IF v_first_admin IS NOT NULL THEN
    INSERT INTO public.clinic_members (clinic_id, user_id, role)
    VALUES (v_clinic_id, v_first_admin, 'owner')
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles SET platform_role = 'super_admin' WHERE id = v_first_admin;
  END IF;

  -- Set active_clinic_id for every profile that is a member
  UPDATE public.profiles p
  SET active_clinic_id = v_clinic_id
  WHERE EXISTS (SELECT 1 FROM public.clinic_members m WHERE m.user_id = p.id);

  -- Stash the clinic id for the loop below
  PERFORM set_config('app.default_clinic_id', v_clinic_id::text, true);
END $$;

-- 10. Add clinic_id to every operational table + backfill + NOT NULL
DO $$
DECLARE
  v_clinic_id uuid := current_setting('app.default_clinic_id', true)::uuid;
  t text;
  tables text[] := ARRAY[
    'patients','appointments','waitlist','recalls','services',
    'booking_requests','intake_forms','tooth_charts','clinical_notes',
    'treatment_plans','treatment_plan_items','fee_schedule',
    'insurance_plans','patient_insurance','invoices','invoice_items',
    'payments','insurance_claims','claim_items','invitations','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET clinic_id = %L WHERE clinic_id IS NULL', t, v_clinic_id);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN clinic_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN clinic_id SET DEFAULT public.current_clinic_id()', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(clinic_id)', t || '_clinic_id_idx', t);
  END LOOP;
END $$;

-- 11. Replace RLS on all operational tables with clinic-scoped policies
DO $$
DECLARE
  t text;
  pol record;
  tables text[] := ARRAY[
    'patients','appointments','waitlist','recalls','services',
    'booking_requests','intake_forms','tooth_charts','clinical_notes',
    'treatment_plans','treatment_plan_items','fee_schedule',
    'insurance_plans','patient_insurance','invoices','invoice_items',
    'payments','insurance_claims','claim_items','invitations','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Standard clinic-scoped policies: read = members of that clinic OR super_admin.
-- Writes = same. (Fine-grained role gating stays in server functions for Phase 2.)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'patients','appointments','waitlist','recalls','services',
    'intake_forms','tooth_charts','clinical_notes',
    'treatment_plans','treatment_plan_items','fee_schedule',
    'insurance_plans','patient_insurance','invoices','invoice_items',
    'payments','insurance_claims','claim_items','invitations','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($f$
      CREATE POLICY "clinic members read" ON public.%I
        FOR SELECT TO authenticated USING (
          public.is_super_admin(auth.uid())
          OR public.is_clinic_member(auth.uid(), clinic_id)
        )
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "clinic members write" ON public.%I
        FOR INSERT TO authenticated WITH CHECK (
          public.is_clinic_member(auth.uid(), clinic_id)
        )
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "clinic members update" ON public.%I
        FOR UPDATE TO authenticated USING (
          public.is_clinic_member(auth.uid(), clinic_id)
        ) WITH CHECK (
          public.is_clinic_member(auth.uid(), clinic_id)
        )
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "clinic members delete" ON public.%I
        FOR DELETE TO authenticated USING (
          public.has_clinic_role(auth.uid(), clinic_id, ARRAY['owner','admin']::public.clinic_role[])
        )
    $f$, t);
  END LOOP;
END $$;

-- booking_requests: public INSERT allowed for the public /book page (anon)
CREATE POLICY "public can create booking requests" ON public.booking_requests
  FOR INSERT TO anon WITH CHECK (true);
GRANT INSERT ON public.booking_requests TO anon;

CREATE POLICY "clinic members read bookings" ON public.booking_requests
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.is_clinic_member(auth.uid(), clinic_id)
  );
CREATE POLICY "clinic members update bookings" ON public.booking_requests
  FOR UPDATE TO authenticated USING (
    public.is_clinic_member(auth.uid(), clinic_id)
  ) WITH CHECK (
    public.is_clinic_member(auth.uid(), clinic_id)
  );
CREATE POLICY "clinic members delete bookings" ON public.booking_requests
  FOR DELETE TO authenticated USING (
    public.has_clinic_role(auth.uid(), clinic_id, ARRAY['owner','admin']::public.clinic_role[])
  );

-- Public read for services on the /book page (needs clinic slug lookup)
CREATE POLICY "public read active services" ON public.services
  FOR SELECT TO anon USING (true);
GRANT SELECT ON public.services TO anon;

-- 12. Trigger to keep updated_at fresh on new tables
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER clinics_updated_at BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER clinic_members_updated_at BEFORE UPDATE ON public.clinic_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
