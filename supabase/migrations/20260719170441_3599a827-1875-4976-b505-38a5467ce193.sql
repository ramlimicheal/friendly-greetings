CREATE POLICY "org creator can self-insert owner membership"
ON public.clinic_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'::clinic_role
  AND EXISTS (
    SELECT 1 FROM public.clinics c
    WHERE c.id = clinic_id
      AND public.is_org_creator(auth.uid(), c.organization_id)
  )
);