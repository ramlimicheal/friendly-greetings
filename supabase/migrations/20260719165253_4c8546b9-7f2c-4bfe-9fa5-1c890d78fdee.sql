
CREATE POLICY "org visible to creator" ON public.organizations
  FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE POLICY "clinic visible to creator of org" ON public.clinics
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = clinics.organization_id AND o.created_by = auth.uid())
  );
