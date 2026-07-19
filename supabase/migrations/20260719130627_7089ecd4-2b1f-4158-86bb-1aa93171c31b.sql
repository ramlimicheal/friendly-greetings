
-- 1) communications log
CREATE TABLE public.communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL DEFAULT public.current_clinic_id() REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  purpose TEXT NOT NULL DEFAULT 'manual', -- manual | appointment_reminder | recall | booking_confirmation | intake_request
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | sent | failed | suppressed
  provider_ref TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communications TO authenticated;
GRANT ALL ON public.communications TO service_role;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view comms" ON public.communications FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert comms" ON public.communications FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update comms" ON public.communications FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete comms" ON public.communications FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_clinic_member(auth.uid(), clinic_id));

CREATE INDEX idx_comms_clinic_created ON public.communications(clinic_id, created_at DESC);
CREATE INDEX idx_comms_patient ON public.communications(patient_id);
CREATE INDEX idx_comms_appointment ON public.communications(appointment_id);

CREATE TRIGGER trg_comms_updated BEFORE UPDATE ON public.communications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) per-clinic settings for reminders and comms defaults
CREATE TABLE public.clinic_settings (
  clinic_id UUID NOT NULL PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_hours_before INTEGER NOT NULL DEFAULT 24,
  sms_from TEXT,
  email_from_name TEXT,
  email_from_address TEXT,
  reminder_sms_template TEXT NOT NULL DEFAULT 'Hi {{patient_first_name}}, this is a reminder of your appointment at {{clinic_name}} on {{appointment_date}} at {{appointment_time}}. Reply STOP to opt out.',
  reminder_email_subject TEXT NOT NULL DEFAULT 'Appointment reminder — {{clinic_name}}',
  reminder_email_body TEXT NOT NULL DEFAULT 'Hi {{patient_first_name}},\n\nThis is a reminder of your appointment at {{clinic_name}} on {{appointment_date}} at {{appointment_time}}.\n\nSee you soon!\n{{clinic_name}}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_settings TO authenticated;
GRANT ALL ON public.clinic_settings TO service_role;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view settings" ON public.clinic_settings FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins can modify settings" ON public.clinic_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_clinic_role(auth.uid(), clinic_id, ARRAY['owner','admin']::clinic_role[]));
CREATE POLICY "Admins can update settings" ON public.clinic_settings FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_clinic_role(auth.uid(), clinic_id, ARRAY['owner','admin']::clinic_role[]));

CREATE TRIGGER trg_clinic_settings_updated BEFORE UPDATE ON public.clinic_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
