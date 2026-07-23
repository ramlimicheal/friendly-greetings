"""
Stage D authorization verification harness — expected-permission specification.

INDEPENDENT SPECIFICATION: Encoded from the canonical Stage D role requirements
in the user's E1-a directive and the roadmap, NOT derived from the current
policies. The tests compare RUNTIME BEHAVIOR against these expectations.

Personas → for each (resource, operation), the expected outcome is one of:
  'allow'   — the statement must succeed for at least one seeded row
  'deny'    — the statement must be rejected (RLS row filter, policy violation,
              trigger exception, or permission-denied)
  'empty'   — the SELECT succeeds at the SQL layer but returns no rows the
              persona is not authorized to see (RLS row filtering)

Where a persona has read access only via row filtering (e.g. a portal user
should be able to SELECT patients but see only their linked row), we use
'empty' when asserting against a row the persona must NOT see, and 'allow'
against a row they must see.
"""

# All UUIDs from harness/seed.sql
CLINIC_A  = 'a0000001-0000-0000-0000-000000000001'
CLINIC_B  = 'b0000001-0000-0000-0000-000000000001'
CLINIC_C  = 'c0000001-0000-0000-0000-000000000001'   # inactive
PATIENT_A = 'aaaa1111-0000-0000-0000-000000000001'
PATIENT_B = 'bbbb1111-0000-0000-0000-000000000001'

PERSONAS = {
    'owner_a':        {'uid':'00000000-0000-0000-0000-000000000001','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':'owner'},
    'admin_a':        {'uid':'00000000-0000-0000-0000-000000000002','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':'admin'},
    'dentist_a':      {'uid':'00000000-0000-0000-0000-000000000003','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':'dentist'},
    'hygienist_a':    {'uid':'00000000-0000-0000-0000-000000000004','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':'hygienist'},
    'assistant_a':    {'uid':'00000000-0000-0000-0000-000000000005','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':'assistant'},
    'frontdesk_a':    {'uid':'00000000-0000-0000-0000-000000000006','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':'front_desk'},
    'billing_a':      {'uid':'00000000-0000-0000-0000-000000000007','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':'billing_specialist'},
    'auditor_a':      {'uid':'00000000-0000-0000-0000-000000000008','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':'read_only_auditor'},
    'dual_active_a':  {'uid':'00000000-0000-0000-0000-000000000009','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':'dentist'},
    'inactive_mem':   {'uid':'00000000-0000-0000-0000-00000000000a','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':None},
    'clinic_c_mem':   {'uid':'00000000-0000-0000-0000-00000000000b','role':'authenticated','active_clinic':CLINIC_C,'clinic_role':'owner'},
    'no_member':      {'uid':'00000000-0000-0000-0000-00000000000c','role':'authenticated','active_clinic':CLINIC_A,'clinic_role':None},
    'super_admin':    {'uid':'00000000-0000-0000-0000-00000000000d','role':'authenticated','active_clinic':None,   'clinic_role':None},
    'support_agent':  {'uid':'00000000-0000-0000-0000-00000000000e','role':'authenticated','active_clinic':None,   'clinic_role':None},
    'portal_a':       {'uid':'00000000-0000-0000-0000-00000000000f','role':'authenticated','active_clinic':None,   'clinic_role':None},
    'anon':           {'uid':None,                                    'role':'anon',        'active_clinic':None,   'clinic_role':None},
}

# Canonical clinic-role capabilities per Stage D. Rows: role, ops it may perform.
# Not derived from policies — enforced by the E1-a specification.
STAFF_READ  = {'owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist','read_only_auditor'}
STAFF_WRITE = {'owner','admin','dentist','hygienist','assistant','front_desk','billing_specialist'}
# read_only_auditor: read only, never mutate

CLINICAL_WRITE   = {'owner','admin','dentist','hygienist'}         # notes, tooth chart, plans
CLINICAL_SIGN    = {'owner','admin','dentist'}                     # sign clinical notes
FINALIZE_PLAN    = {'owner','admin','dentist','hygienist'}         # NOT assistant
MEDICAL_FIELDS   = {'owner','admin','dentist','hygienist'}         # allergies/meds/conditions
FINANCIAL_WRITE  = {'owner','admin','billing_specialist','front_desk'}  # invoices/payments/claims
# dentist/hygienist may VIEW financial but not mutate
SETTINGS_WRITE   = {'owner','admin'}
STAFF_MGMT       = {'owner','admin'}

# Expectation matrix: (persona, resource, op) → 'allow' | 'deny' | 'empty'
# Only the rows explicitly listed here are asserted. Anything unlisted is skipped.
EXPECTATIONS = {}

def E(persona, resource, op, expect, note=''):
    EXPECTATIONS[(persona, resource, op)] = (expect, note)

# ---------------------------------------------------------------- CROSS-TENANT
# Every Clinic-A staff role must not see Clinic B records.
for p in ['owner_a','admin_a','dentist_a','hygienist_a','assistant_a',
          'frontdesk_a','billing_a','auditor_a']:
    E(p, 'patients_clinic_b',   'select',  'empty', 'Clinic isolation')
    E(p, 'appointments_clinic_b','select', 'empty', 'Clinic isolation')

# Anonymous cannot read operational tables.
for r in ['patients','appointments','clinical_notes','invoices','payments',
          'audit_log','clinic_members','profiles','patient_files',
          'communications','clinical_notes','treatment_plans','tooth_charts']:
    E('anon', r, 'select', 'empty', 'anon has no operational access')

# --------------------------------------------------------- STAFF BASIC ACCESS
for p in ['owner_a','admin_a','dentist_a','hygienist_a','assistant_a',
          'frontdesk_a','billing_a','auditor_a']:
    E(p, 'patients_clinic_a',    'select', 'allow', 'staff read own clinic')
    E(p, 'appointments_clinic_a','select', 'allow', 'staff read own clinic')

# ------------------------------------------------------- MEDICAL FIELD GUARD
# Front desk cannot mutate medical arrays (allergies/medications/conditions)
E('frontdesk_a', 'patient_medical_fields', 'update', 'deny',
  'front_desk cannot modify medical fields')
E('dentist_a',   'patient_medical_fields', 'update', 'allow',
  'dentist can modify medical fields')
E('hygienist_a', 'patient_medical_fields', 'update', 'allow',
  'hygienist can modify medical fields')

# ------------------------------------------------------- CLINICAL AUTHORITY
# Assistants cannot sign notes
E('assistant_a', 'clinical_notes_sign', 'insert', 'deny',
  'assistant cannot sign clinical notes')
E('dentist_a',   'clinical_notes_sign', 'insert', 'allow',
  'dentist may sign clinical notes')

# Signed notes reject update + delete regardless of role
E('dentist_a', 'signed_clinical_note', 'update', 'deny', 'immutable when signed')
E('owner_a',   'signed_clinical_note', 'delete', 'deny', 'immutable when signed')

# Assistants cannot finalize plans (accept/complete)
E('assistant_a', 'treatment_plan_finalize', 'update', 'deny',
  'assistant cannot finalize plans')
E('dentist_a',   'treatment_plan_finalize', 'update', 'allow',
  'dentist may finalize plans')

# Billing specialist cannot alter clinical records
E('billing_a', 'clinical_notes_new', 'insert', 'deny',
  'billing_specialist has no clinical write')
E('billing_a', 'tooth_charts_new',   'insert', 'deny',
  'billing_specialist has no clinical write')

# Read-only auditor: no mutation anywhere
for r in ['patients_new','appointments_new','clinical_notes_new',
          'invoices_new','payments_new','patient_files_new']:
    E('auditor_a', r, 'insert', 'deny', 'auditor has zero mutation paths')

# Financial read/mutate:
# - dentist may view financials (per permissions.ts billing.view) but not mutate
# - hygienist is intentionally excluded from financial reads (permissions.ts)
E('dentist_a',   'invoices_clinic_a', 'select', 'allow', 'dentist may view financials')
E('hygienist_a', 'invoices_clinic_a', 'select', 'empty',
  'hygienist has no billing.view — spec resolved to deny financial reads')
for p in ['dentist_a','hygienist_a']:
    E(p, 'invoices_new', 'insert', 'deny', 'clinicians may not mutate financials')
    E(p, 'payments_new', 'insert', 'deny', 'clinicians may not mutate financials')

# Financial roles may create invoices
for p in ['owner_a','admin_a','billing_a','frontdesk_a']:
    E(p, 'invoices_new', 'insert', 'allow', 'financial write allowed')

# ------------------------------------------------------- INVOICE / PAYMENT IMMUTABILITY
E('owner_a', 'issued_invoice', 'delete', 'deny', 'issued invoices reject delete')
E('owner_a', 'payment_row',    'delete', 'deny', 'payments reject delete')

# ------------------------------------------------------- AUDIT LOG IMMUTABILITY
E('owner_a', 'audit_log', 'update', 'deny', 'audit rows reject update')
E('owner_a', 'audit_log', 'delete', 'deny', 'audit rows reject delete')

# ------------------------------------------------------- CLINIC_ID IMMUTABILITY
E('owner_a', 'patient_clinic_move', 'update', 'deny',
  'clinic_id is immutable after create')

# ------------------------------------------------------- ACTIVE-CLINIC / MEMBERSHIP
# Inactive membership grants no access
E('inactive_mem', 'patients_clinic_a', 'select', 'empty',
  'inactive membership grants no access')
# Member of inactive clinic gets no access to their clinic
E('clinic_c_mem', 'patients_clinic_a', 'select', 'empty',
  'inactive clinic grants no access')
E('clinic_c_mem', 'patients_clinic_c', 'select', 'empty',
  'inactive clinic grants no access to own clinic either')
# no_member: active_clinic_id set but no membership row → no access
E('no_member', 'patients_clinic_a', 'select', 'empty',
  'profile.active_clinic_id alone does not grant membership')

# Dual member sees ONLY active clinic (Clinic A active)
E('dual_active_a', 'patients_clinic_a', 'select', 'allow',
  'dual member sees active clinic')
E('dual_active_a', 'patients_clinic_b', 'select', 'empty',
  'dual member does NOT see non-active clinic')

# ------------------------------------------------------- SUPER-ADMIN / SUPPORT
# Super admin without clinic membership: no automatic PHI access
E('super_admin', 'patients_clinic_a',   'select', 'empty',
  'super_admin without membership has no direct PHI access')
E('super_admin', 'clinical_notes_clinic_a', 'select', 'empty',
  'super_admin without membership has no direct PHI access')
# Support agent: same
E('support_agent','patients_clinic_a',  'select', 'empty',
  'support_agent has no automatic PHI access')

# ------------------------------------------------------- PORTAL USER
E('portal_a', 'patients_self',        'select', 'allow',
  'portal user reads own patient row')
E('portal_a', 'patients_clinic_b',    'select', 'empty',
  'portal user cannot read another clinic')
E('portal_a', 'treatment_plan_visible','select', 'allow',
  'portal user reads visible plan')
E('portal_a', 'treatment_plan_hidden','select',  'empty',
  'portal user cannot read staff-only plan')
E('portal_a', 'patient_files_visible','select',  'allow',
  'portal user reads visible file')
E('portal_a', 'patient_files_staff_only','select','empty',
  'portal user cannot read staff-only file')
E('portal_a', 'clinical_notes_clinic_a','select','empty',
  'portal user cannot read internal notes')
E('portal_a', 'audit_log',            'select', 'empty',
  'portal user cannot read audit')
E('portal_a', 'clinic_members',       'select', 'empty',
  'portal user cannot read staff list')
E('portal_a', 'patients_new',         'insert', 'deny',
  'portal user has no operational mutation')
E('portal_a', 'appointments_new',     'insert', 'deny',
  'portal user has no operational mutation')
E('portal_a', 'patient_medical_fields','update', 'deny',
  'portal user cannot mutate patient')
E('portal_a', 'patient_files_new',    'insert', 'deny',
  'portal user cannot mutate files')
E('portal_a', 'patient_portal_users_self','update','deny',
  'portal user cannot self-elevate access row')

# ------------------------------------------------------- ACTOR FORGERY GUARDS
E('dentist_a', 'clinical_note_forge_created_by','insert','deny',
  'user cannot forge created_by')
E('dentist_a', 'clinical_note_forge_signed_by', 'insert','deny',
  'user cannot forge signed_by (server overrides)')

# ------------------------------------------------------- PLATFORM-ROLE ESCALATION
E('dentist_a', 'profiles_self_elevate_platform_role','update','deny',
  'user cannot self-elevate platform_role')
E('dentist_a', 'profiles_self_active_clinic_direct','update','deny',
  'user cannot change active_clinic_id outside RPC')

# ------------------------------------------------------- STAFF MANAGEMENT
E('dentist_a', 'clinic_members_self_promote','update','deny',
  'non-admin cannot alter memberships')
E('admin_a',   'clinic_members_owner_touch','update','deny',
  'admin cannot manage owner memberships')

# ------------------------------------------------------- RPC AUTHORIZATION
# switch_active_clinic
E('dentist_a', 'rpc.switch_active_clinic.self_own',         'call','allow',
  'dentist can switch to their own clinic')
E('dentist_a', 'rpc.switch_active_clinic.foreign',          'call','deny',
  'dentist cannot switch to a clinic they do not belong to')
E('no_member', 'rpc.switch_active_clinic.foreign',          'call','deny',
  'no-member cannot switch to any clinic')

# create_clinic_invitation
E('dentist_a', 'rpc.create_clinic_invitation',              'call','deny',
  'non-admin cannot invite staff')
E('admin_a',   'rpc.create_clinic_invitation',              'call','allow',
  'admin can invite staff (non-owner)')
E('admin_a',   'rpc.create_clinic_invitation.owner_role',   'call','deny',
  'admin cannot issue owner invitation')

# set_platform_role: authenticated must be denied EXECUTE
E('owner_a',   'rpc.set_platform_role.execute',             'call','deny',
  'set_platform_role must be service_role only')

# public RPCs
E('anon', 'rpc.submit_booking_request',       'call','allow',
  'public booking submission is intentionally anon-callable')
E('anon', 'rpc.public_list_clinic_services',  'call','allow',
  'public service listing is intentionally anon-callable')

# platform stats — non super_admin denied
E('owner_a', 'rpc.platform_clinic_stats', 'call','deny',
  'platform stats reject non-super_admin')

TOTAL_ASSERTIONS = len(EXPECTATIONS)

if __name__ == '__main__':
    print(f"expected assertions: {TOTAL_ASSERTIONS}")
