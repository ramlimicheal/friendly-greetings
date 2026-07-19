
-- 1) patient_files table
CREATE TABLE public.patient_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL DEFAULT public.current_clinic_id() REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'document',
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  size_bytes BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_files TO authenticated;
GRANT ALL ON public.patient_files TO service_role;

ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view patient files"
  ON public.patient_files FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can insert patient files"
  ON public.patient_files FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can update patient files"
  ON public.patient_files FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can delete patient files"
  ON public.patient_files FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_clinic_member(auth.uid(), clinic_id));

CREATE INDEX idx_patient_files_patient ON public.patient_files(patient_id);
CREATE INDEX idx_patient_files_clinic ON public.patient_files(clinic_id);

CREATE TRIGGER trg_patient_files_updated
  BEFORE UPDATE ON public.patient_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Storage RLS: files under clinic-files must be prefixed with the clinic_id
-- Path pattern: <clinic_id>/<patient_id>/<uuid>-<filename>

CREATE POLICY "Clinic members can read own clinic files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'clinic-files'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_clinic_member(auth.uid(), (split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "Clinic members can upload to own clinic"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-files'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_clinic_member(auth.uid(), (split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "Clinic members can update own clinic files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'clinic-files'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_clinic_member(auth.uid(), (split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "Clinic members can delete own clinic files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'clinic-files'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_clinic_member(auth.uid(), (split_part(name, '/', 1))::uuid)
    )
  );
