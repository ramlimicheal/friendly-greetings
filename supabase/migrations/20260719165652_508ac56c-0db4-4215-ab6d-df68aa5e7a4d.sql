
DROP POLICY IF EXISTS "clinic visible to creator of org" ON public.clinics;

CREATE OR REPLACE FUNCTION public.is_org_creator(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND created_by = _user_id)
$$;

CREATE POLICY "clinic visible to creator of org" ON public.clinics
  FOR SELECT TO authenticated USING (public.is_org_creator(auth.uid(), organization_id));
