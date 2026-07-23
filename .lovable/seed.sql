-- Stage D authorization harness — synthetic fixtures.
-- All IDs are stable + test-prefixed. Run as postgres (owner).
-- All email addresses use the *.test TLD; all names are 'test_*'.

BEGIN;

-- 1. Users that own downstream records must exist first.
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
 ('00000000-0000-0000-0000-000000000001','test_owner_a@example.test',       now(), '{"full_name":"test_owner_a"}'),
 ('00000000-0000-0000-0000-000000000002','test_admin_a@example.test',       now(), '{"full_name":"test_admin_a"}'),
 ('00000000-0000-0000-0000-000000000003','test_dentist_a@example.test',     now(), '{"full_name":"test_dentist_a"}'),
 ('00000000-0000-0000-0000-000000000004','test_hygienist_a@example.test',   now(), '{"full_name":"test_hygienist_a"}'),
 ('00000000-0000-0000-0000-000000000005','test_assistant_a@example.test',   now(), '{"full_name":"test_assistant_a"}'),
 ('00000000-0000-0000-0000-000000000006','test_frontdesk_a@example.test',   now(), '{"full_name":"test_frontdesk_a"}'),
 ('00000000-0000-0000-0000-000000000007','test_billing_a@example.test',     now(), '{"full_name":"test_billing_a"}'),
 ('00000000-0000-0000-0000-000000000008','test_auditor_a@example.test',     now(), '{"full_name":"test_auditor_a"}'),
 ('00000000-0000-0000-0000-000000000009','test_dual_user@example.test',     now(), '{"full_name":"test_dual"}'),
 ('00000000-0000-0000-0000-00000000000a','test_inactive_mem@example.test',  now(), '{"full_name":"test_inactive_mem"}'),
 ('00000000-0000-0000-0000-00000000000b','test_clinic_c_mem@example.test',  now(), '{"full_name":"test_clinic_c_mem"}'),
 ('00000000-0000-0000-0000-00000000000c','test_no_member@example.test',     now(), '{"full_name":"test_no_member"}'),
 ('00000000-0000-0000-0000-00000000000d','test_super_admin@example.test',   now(), '{"full_name":"test_super_admin"}'),
 ('00000000-0000-0000-0000-00000000000e','test_support_agent@example.test', now(), '{"full_name":"test_support_agent"}'),
 ('00000000-0000-0000-0000-00000000000f','test_portal_a@example.test',      now(), '{"full_name":"test_portal_a"}'),
 ('00000000-0000-0000-0000-000000000010','test_owner_b@example.test',       now(), '{"full_name":"test_owner_b"}');

-- Organization + clinics
INSERT INTO public.organizations (id, name, created_by)
VALUES ('11111111-0000-0000-0000-000000000001','test_org','00000000-0000-0000-0000-000000000001');

INSERT INTO public.clinics (id, organization_id, name, slug, is_active) VALUES
 ('a0000001-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','test_clinic_a','test-clinic-a', true),
 ('b0000001-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','test_clinic_b','test-clinic-b', true),
 ('c0000001-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','test_clinic_c_inactive','test-clinic-c', false);

-- Memberships
INSERT INTO public.clinic_members (clinic_id, user_id, role, is_active) VALUES
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','owner',              true),
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','admin',              true),
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','dentist',            true),
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','hygienist',          true),
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','assistant',          true),
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','front_desk',         true),
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000007','billing_specialist', true),
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000008','read_only_auditor',  true),
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000009','dentist',            true),
 ('b0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000009','dentist',            true),
 ('a0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','dentist',            false),
 ('c0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','owner',              true),
 ('b0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','owner',              true);

-- Profile updates
UPDATE public.profiles SET active_clinic_id = 'a0000001-0000-0000-0000-000000000001'
 WHERE id IN (
  '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-00000000000c');
UPDATE public.profiles SET active_clinic_id = 'c0000001-0000-0000-0000-000000000001'
 WHERE id = '00000000-0000-0000-0000-00000000000b';
UPDATE public.profiles SET active_clinic_id = 'b0000001-0000-0000-0000-000000000001'
 WHERE id = '00000000-0000-0000-0000-000000000010';
UPDATE public.profiles SET platform_role='super_admin'   WHERE id='00000000-0000-0000-0000-00000000000d';
UPDATE public.profiles SET platform_role='support_agent' WHERE id='00000000-0000-0000-0000-00000000000e';

-- Patients (full_name + chart_no required)
INSERT INTO public.patients (id, clinic_id, full_name, chart_no, allergies, medications, medical_conditions) VALUES
 ('aaaa1111-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','test_pat_a','TEST-PAT-A',ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]),
 ('bbbb1111-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','test_pat_b','TEST-PAT-B',ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]);

-- Portal identity
INSERT INTO public.patient_portal_users (user_id, patient_id, clinic_id, is_active, linked_at)
VALUES ('00000000-0000-0000-0000-00000000000f','aaaa1111-0000-0000-0000-000000000001',
        'a0000001-0000-0000-0000-000000000001', true, now());

-- Services
INSERT INTO public.services (id, clinic_id, name, duration_min)
VALUES ('11110000-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','test_service', 30);

-- Fee schedule
INSERT INTO public.fee_schedule (id, clinic_id, code, description, default_fee)
VALUES ('11110000-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001','TEST-FEE','test fee', 100);

-- Appointment
INSERT INTO public.appointments (id, clinic_id, patient_id, procedure, start_at, duration_min, chair, provider)
VALUES ('11110000-0000-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001', 'test_proc',
        now() + interval '1 day', 30, 1, 'test_provider');

-- Waitlist
INSERT INTO public.waitlist (id, clinic_id, patient_id, procedure)
VALUES ('11110000-0000-0000-0000-000000000004','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001','test_proc');

-- Recall
INSERT INTO public.recalls (id, clinic_id, patient_id, next_due_at)
VALUES ('11110000-0000-0000-0000-000000000005','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001', now() + interval '30 days');

-- Booking request
INSERT INTO public.booking_requests (id, clinic_id, full_name, phone, preferred_date, preferred_time, status)
VALUES ('11110000-0000-0000-0000-000000000006','a0000001-0000-0000-0000-000000000001',
        'test_walkin','+10000000000', current_date + 2, '10:00','pending');

-- Tooth chart (one tooth row per patient)
INSERT INTO public.tooth_charts (id, clinic_id, patient_id, tooth_number)
VALUES ('11110000-0000-0000-0000-000000000007','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001', 11);

-- Clinical notes: one draft, one signed
INSERT INTO public.clinical_notes (id, clinic_id, patient_id, subjective)
VALUES ('11110000-0000-0000-0000-000000000008','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001','test draft note'),
       ('11110000-0000-0000-0000-000000000018','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001','test signed note');
UPDATE public.clinical_notes
   SET signed_at = now(), signed_by = '00000000-0000-0000-0000-000000000003'
 WHERE id = '11110000-0000-0000-0000-000000000018';

-- Treatment plans (visible + hidden)
INSERT INTO public.treatment_plans (id, clinic_id, patient_id, title, is_patient_visible) VALUES
 ('11110000-0000-0000-0000-000000000009','a0000001-0000-0000-0000-000000000001','aaaa1111-0000-0000-0000-000000000001','test_plan_visible', true),
 ('11110000-0000-0000-0000-000000000019','a0000001-0000-0000-0000-000000000001','aaaa1111-0000-0000-0000-000000000001','test_plan_hidden',  false);

-- Treatment plan item
INSERT INTO public.treatment_plan_items (id, clinic_id, plan_id, procedure_code, description)
VALUES ('11110000-0000-0000-0000-00000000000a','a0000001-0000-0000-0000-000000000001',
        '11110000-0000-0000-0000-000000000009','TEST','test item');

-- Insurance plan / patient insurance
INSERT INTO public.insurance_plans (id, clinic_id, payer_name, plan_name)
VALUES ('11110000-0000-0000-0000-00000000000b','a0000001-0000-0000-0000-000000000001','test_carrier','test plan');
INSERT INTO public.patient_insurance (id, clinic_id, patient_id, plan_id, subscriber_name)
VALUES ('11110000-0000-0000-0000-00000000000c','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001','11110000-0000-0000-0000-00000000000b','test sub');

-- Invoices: draft + issued
INSERT INTO public.invoices (id, clinic_id, patient_id, status) VALUES
 ('11110000-0000-0000-0000-00000000000d','a0000001-0000-0000-0000-000000000001','aaaa1111-0000-0000-0000-000000000001','draft'),
 ('11110000-0000-0000-0000-00000000001d','a0000001-0000-0000-0000-000000000001','aaaa1111-0000-0000-0000-000000000001','issued');
INSERT INTO public.invoice_items (id, clinic_id, invoice_id, procedure_code, description)
VALUES ('11110000-0000-0000-0000-00000000000e','a0000001-0000-0000-0000-000000000001',
        '11110000-0000-0000-0000-00000000000d','TEST','test');
INSERT INTO public.payments (id, clinic_id, invoice_id, patient_id, amount)
VALUES ('11110000-0000-0000-0000-00000000000f','a0000001-0000-0000-0000-000000000001',
        '11110000-0000-0000-0000-00000000001d','aaaa1111-0000-0000-0000-000000000001',50);

-- Insurance claim + item
INSERT INTO public.insurance_claims (id, clinic_id, patient_id)
VALUES ('11110000-0000-0000-0000-000000000010','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001');
INSERT INTO public.claim_items (id, clinic_id, claim_id, procedure_code, description)
VALUES ('11110000-0000-0000-0000-000000000011','a0000001-0000-0000-0000-000000000001',
        '11110000-0000-0000-0000-000000000010','TEST','test');

-- Audit log
INSERT INTO public.audit_log (user_id, clinic_id, action)
VALUES ('00000000-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','test.seed');

-- Files (visible + staff-only)
INSERT INTO public.patient_files (id, clinic_id, patient_id, file_name, storage_path, is_patient_visible) VALUES
 ('11110000-0000-0000-0000-000000000012','a0000001-0000-0000-0000-000000000001',
  'aaaa1111-0000-0000-0000-000000000001','test_visible.pdf',
  'a0000001-0000-0000-0000-000000000001/aaaa1111-0000-0000-0000-000000000001/test_visible.pdf', true),
 ('11110000-0000-0000-0000-000000000022','a0000001-0000-0000-0000-000000000001',
  'aaaa1111-0000-0000-0000-000000000001','test_staff_only.pdf',
  'a0000001-0000-0000-0000-000000000001/aaaa1111-0000-0000-0000-000000000001/test_staff_only.pdf', false);

-- Communications
INSERT INTO public.communications (id, clinic_id, patient_id, channel, direction, to_address, body, status)
VALUES ('11110000-0000-0000-0000-000000000013','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001','sms','outbound','+10000000001','test','queued');

-- Clinic settings
INSERT INTO public.clinic_settings (clinic_id) VALUES ('a0000001-0000-0000-0000-000000000001');

-- Intake form
INSERT INTO public.intake_forms (id, clinic_id, patient_id, full_name)
VALUES ('11110000-0000-0000-0000-000000000015','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001','test_intake');

-- Invitations
INSERT INTO public.invitations (id, clinic_id, email, clinic_role, token_hash, expires_at)
VALUES ('11110000-0000-0000-0000-000000000016','a0000001-0000-0000-0000-000000000001',
        'test_invite@example.test','dentist',
        encode(digest('test_seed_token','sha256'),'hex'), now() + interval '7 days');
INSERT INTO public.patient_portal_invitations (id, clinic_id, patient_id, email, token_hash, expires_at)
VALUES ('11110000-0000-0000-0000-000000000017','a0000001-0000-0000-0000-000000000001',
        'aaaa1111-0000-0000-0000-000000000001','test_portal_invite@example.test',
        encode(digest('test_portal_token','sha256'),'hex'), now() + interval '14 days');

-- Clinic B minimum records to test cross-tenant reads
INSERT INTO public.appointments (id, clinic_id, patient_id, procedure, start_at, duration_min, chair, provider)
VALUES ('22220000-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001',
        'bbbb1111-0000-0000-0000-000000000001','test_proc', now() + interval '1 day', 30, 1, 'test_provider');

COMMIT;
