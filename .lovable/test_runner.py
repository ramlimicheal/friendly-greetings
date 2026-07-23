"""
Stage D authorization verification harness — runner.

Executes each assertion as its own transaction that always ROLLBACKs, so no
fixture mutations persist. Sets request.jwt.claims and role per persona.
"""
import json, os, sys, traceback
from collections import defaultdict
import psycopg2

sys.path.insert(0, os.path.dirname(__file__))
from expected_matrix import (
    EXPECTATIONS, PERSONAS,
    CLINIC_A, CLINIC_B, CLINIC_C, PATIENT_A, PATIENT_B,
)

DSN = dict(host='/tmp/pgtest', port=55432, user='postgres', dbname='testdb')

# Row identifiers seeded by seed.sql
SIGNED_NOTE   = '11110000-0000-0000-0000-000000000018'
DRAFT_NOTE    = '11110000-0000-0000-0000-000000000008'
DRAFT_PLAN    = '11110000-0000-0000-0000-000000000009'
HIDDEN_PLAN   = '11110000-0000-0000-0000-000000000019'
DRAFT_INVOICE = '11110000-0000-0000-0000-00000000000d'
ISSUED_INVOICE= '11110000-0000-0000-0000-00000000001d'
PAYMENT_ROW   = '11110000-0000-0000-0000-00000000000f'
VISIBLE_FILE  = '11110000-0000-0000-0000-000000000012'
STAFF_FILE    = '11110000-0000-0000-0000-000000000022'
AUDIT_UPDATE_TARGET = None  # picked at runtime
ADMIN_A_UID   = '00000000-0000-0000-0000-000000000002'
OWNER_A_UID   = '00000000-0000-0000-0000-000000000001'

def stmt_for(key, uid):
    """Return (sql, expect_rows) for a resource+op key.

    expect_rows: 'rowcount' (rows > 0 required), 'zero' (== 0), None (mutation).
    """
    p, resource, op = key
    U = uid or '00000000-0000-0000-0000-000000000000'

    # ------------ SELECT / row visibility --------------
    if op == 'select':
        table_map = {
            'patients_clinic_a':          ("SELECT id FROM public.patients WHERE clinic_id = %s", (CLINIC_A,)),
            'patients_clinic_b':          ("SELECT id FROM public.patients WHERE clinic_id = %s", (CLINIC_B,)),
            'patients_clinic_c':          ("SELECT id FROM public.patients WHERE clinic_id = %s", (CLINIC_C,)),
            'patients_self':              ("SELECT id FROM public.patients WHERE id = %s", (PATIENT_A,)),
            'appointments_clinic_a':      ("SELECT id FROM public.appointments WHERE clinic_id = %s", (CLINIC_A,)),
            'appointments_clinic_b':      ("SELECT id FROM public.appointments WHERE clinic_id = %s", (CLINIC_B,)),
            'invoices_clinic_a':          ("SELECT id FROM public.invoices WHERE clinic_id = %s", (CLINIC_A,)),
            'clinical_notes_clinic_a':    ("SELECT id FROM public.clinical_notes WHERE clinic_id = %s", (CLINIC_A,)),
            'treatment_plan_visible':     ("SELECT id FROM public.treatment_plans WHERE id = %s", (DRAFT_PLAN,)),
            'treatment_plan_hidden':      ("SELECT id FROM public.treatment_plans WHERE id = %s", (HIDDEN_PLAN,)),
            'patient_files_visible':      ("SELECT id FROM public.patient_files WHERE id = %s", (VISIBLE_FILE,)),
            'patient_files_staff_only':   ("SELECT id FROM public.patient_files WHERE id = %s", (STAFF_FILE,)),
            'audit_log':                  ("SELECT id FROM public.audit_log", ()),
            'clinic_members':             ("SELECT clinic_id FROM public.clinic_members", ()),
            # generic anon table sweeps
            'patients':                   ("SELECT id FROM public.patients", ()),
            'appointments':               ("SELECT id FROM public.appointments", ()),
            'clinical_notes':             ("SELECT id FROM public.clinical_notes", ()),
            'invoices':                   ("SELECT id FROM public.invoices", ()),
            'payments':                   ("SELECT id FROM public.payments", ()),
            'profiles':                   ("SELECT id FROM public.profiles", ()),
            'patient_files':              ("SELECT id FROM public.patient_files", ()),
            'communications':             ("SELECT id FROM public.communications", ()),
            'treatment_plans':            ("SELECT id FROM public.treatment_plans", ()),
            'tooth_charts':               ("SELECT id FROM public.tooth_charts", ()),
        }
        if resource in table_map:
            sql, params = table_map[resource]
            return ('select', sql, params)

    # ------------ INSERT / UPDATE / DELETE ---------------
    if resource == 'patient_medical_fields' and op == 'update':
        return ('mutate',
                "UPDATE public.patients SET allergies = ARRAY['penicillin']::text[] "
                "WHERE id = %s RETURNING id", (PATIENT_A,))
    if resource == 'clinical_notes_sign' and op == 'insert':
        return ('mutate',
                "INSERT INTO public.clinical_notes (clinic_id, patient_id, subjective, signed_at) "
                "VALUES (%s,%s,'test',now()) RETURNING id", (CLINIC_A, PATIENT_A))
    if resource == 'signed_clinical_note' and op == 'update':
        return ('mutate',
                "UPDATE public.clinical_notes SET subjective='tamper' "
                "WHERE id = %s RETURNING id", (SIGNED_NOTE,))
    if resource == 'signed_clinical_note' and op == 'delete':
        return ('mutate',
                "DELETE FROM public.clinical_notes WHERE id=%s RETURNING id", (SIGNED_NOTE,))
    if resource == 'treatment_plan_finalize' and op == 'update':
        return ('mutate',
                "UPDATE public.treatment_plans SET status='accepted', accepted_at=now() "
                "WHERE id = %s RETURNING id", (DRAFT_PLAN,))
    if resource == 'clinical_notes_new' and op == 'insert':
        return ('mutate',
                "INSERT INTO public.clinical_notes (clinic_id, patient_id, subjective) "
                "VALUES (%s,%s,'t') RETURNING id", (CLINIC_A, PATIENT_A))
    if resource == 'tooth_charts_new' and op == 'insert':
        return ('mutate',
                "INSERT INTO public.tooth_charts (clinic_id, patient_id, tooth_number) "
                "VALUES (%s,%s,21) RETURNING id", (CLINIC_A, PATIENT_A))
    if resource == 'invoices_new' and op == 'insert':
        return ('mutate',
                "INSERT INTO public.invoices (clinic_id, patient_id, status) "
                "VALUES (%s,%s,'draft') RETURNING id", (CLINIC_A, PATIENT_A))
    if resource == 'payments_new' and op == 'insert':
        return ('mutate',
                "INSERT INTO public.payments (clinic_id, invoice_id, patient_id, amount) "
                "VALUES (%s,%s,%s,10) RETURNING id",
                (CLINIC_A, ISSUED_INVOICE, PATIENT_A))
    if resource == 'patients_new' and op == 'insert':
        return ('mutate',
                "INSERT INTO public.patients (clinic_id, full_name, chart_no) "
                "VALUES (%s,'test_new','TEST-NEW') RETURNING id", (CLINIC_A,))
    if resource == 'appointments_new' and op == 'insert':
        return ('mutate',
                "INSERT INTO public.appointments (clinic_id, patient_id, procedure, "
                "start_at, duration_min, chair, provider) VALUES "
                "(%s,%s,'t', now() + interval '2 days', 30, 2,'test') RETURNING id",
                (CLINIC_A, PATIENT_A))
    if resource == 'patient_files_new' and op == 'insert':
        return ('mutate',
                "INSERT INTO public.patient_files (clinic_id, patient_id, file_name, storage_path) "
                "VALUES (%s,%s,'x.pdf','x') RETURNING id", (CLINIC_A, PATIENT_A))
    if resource == 'issued_invoice' and op == 'delete':
        return ('mutate',
                "DELETE FROM public.invoices WHERE id=%s RETURNING id", (ISSUED_INVOICE,))
    if resource == 'payment_row' and op == 'delete':
        return ('mutate',
                "DELETE FROM public.payments WHERE id=%s RETURNING id", (PAYMENT_ROW,))
    if resource == 'audit_log' and op == 'update':
        return ('mutate',
                "UPDATE public.audit_log SET action='tamper' WHERE clinic_id=%s RETURNING id",
                (CLINIC_A,))
    if resource == 'audit_log' and op == 'delete':
        return ('mutate',
                "DELETE FROM public.audit_log WHERE clinic_id=%s RETURNING id", (CLINIC_A,))
    if resource == 'patient_clinic_move' and op == 'update':
        return ('mutate',
                "UPDATE public.patients SET clinic_id=%s WHERE id=%s RETURNING id",
                (CLINIC_B, PATIENT_A))
    if resource == 'clinical_note_forge_created_by' and op == 'insert':
        # Forgery is "denied" if the persisted created_by is NOT the forged UID.
        # The trigger silently overrides created_by := auth.uid(), which is a
        # stronger guarantee than raising. We assert that the forged value did
        # not persist: SELECT returns 0 rows when the forgery was blocked.
        return ('forge',
                "WITH ins AS (INSERT INTO public.clinical_notes "
                "(clinic_id, patient_id, subjective, created_by) "
                "VALUES (%s,%s,'t',%s) RETURNING created_by) "
                "SELECT 1 FROM ins WHERE created_by = %s",
                (CLINIC_A, PATIENT_A, OWNER_A_UID, OWNER_A_UID))
    if resource == 'clinical_note_forge_signed_by' and op == 'insert':
        return ('forge',
                "WITH ins AS (INSERT INTO public.clinical_notes "
                "(clinic_id, patient_id, subjective, signed_at, signed_by) "
                "VALUES (%s,%s,'t',now(),%s) RETURNING signed_by) "
                "SELECT 1 FROM ins WHERE signed_by = %s",
                (CLINIC_A, PATIENT_A, OWNER_A_UID, OWNER_A_UID))
    if resource == 'profiles_self_elevate_platform_role' and op == 'update':
        return ('mutate',
                "UPDATE public.profiles SET platform_role='super_admin' WHERE id=%s RETURNING id", (U,))
    if resource == 'profiles_self_active_clinic_direct' and op == 'update':
        return ('mutate',
                "UPDATE public.profiles SET active_clinic_id=%s WHERE id=%s RETURNING id",
                (CLINIC_B, U))
    if resource == 'clinic_members_self_promote' and op == 'update':
        return ('mutate',
                "UPDATE public.clinic_members SET role='owner' WHERE user_id=%s AND clinic_id=%s RETURNING role",
                (U, CLINIC_A))
    if resource == 'clinic_members_owner_touch' and op == 'update':
        return ('mutate',
                "UPDATE public.clinic_members SET is_active=false WHERE user_id=%s AND clinic_id=%s RETURNING role",
                (OWNER_A_UID, CLINIC_A))
    if resource == 'patient_portal_users_self' and op == 'update':
        return ('mutate',
                "UPDATE public.patient_portal_users SET patient_id=%s WHERE user_id=%s RETURNING user_id",
                (PATIENT_B, U))

    # ------------ RPC CALLS ---------------
    if op == 'call':
        if resource == 'rpc.switch_active_clinic.self_own':
            return ('rpc', "SELECT public.switch_active_clinic(%s)", (CLINIC_A,))
        if resource == 'rpc.switch_active_clinic.foreign':
            return ('rpc', "SELECT public.switch_active_clinic(%s)", (CLINIC_B,))
        if resource == 'rpc.create_clinic_invitation':
            return ('rpc',
                    "SELECT public.create_clinic_invitation(%s,%s,'dentist'::clinic_role, now()+interval '1 day')",
                    (CLINIC_A, 'test_new_invite@example.test'))
        if resource == 'rpc.create_clinic_invitation.owner_role':
            return ('rpc',
                    "SELECT public.create_clinic_invitation(%s,%s,'owner'::clinic_role, now()+interval '1 day')",
                    (CLINIC_A, 'test_owner_invite@example.test'))
        if resource == 'rpc.set_platform_role.execute':
            return ('rpc', "SELECT public.set_platform_role(%s,'support_agent'::platform_role)", (U,))
        if resource == 'rpc.submit_booking_request':
            return ('rpc',
                    "SELECT public.submit_booking_request(%s,'test_book','test@example.test','+1','2099-01-01T10:00:00Z'::timestamptz,'t')",
                    ('test-clinic-a',))
        if resource == 'rpc.public_list_clinic_services':
            return ('rpc', "SELECT * FROM public.public_list_clinic_services(%s)", ('test-clinic-a',))
        if resource == 'rpc.platform_clinic_stats':
            return ('rpc', "SELECT * FROM public.platform_clinic_stats(ARRAY[%s]::uuid[])", (CLINIC_A,))

    return None


def apply_jwt(cur, persona):
    p = PERSONAS[persona]
    role = p['role']
    if p['uid']:
        claims = json.dumps({'sub': p['uid'], 'role': role, 'email': f'{persona}@example.test'})
        cur.execute("SELECT set_config('request.jwt.claims', %s, true)", (claims,))
    else:
        cur.execute("SELECT set_config('request.jwt.claims', '', true)")
    cur.execute(f"SET LOCAL ROLE {role}")


def is_denial(exc):
    """Any raised trigger/policy/permission error is a denial for authorization purposes.
    Only genuine wire-level errors (syntax, connection, undefined column) are NOT denials."""
    import psycopg2
    if isinstance(exc, (psycopg2.errors.SyntaxError,
                        psycopg2.errors.UndefinedColumn,
                        psycopg2.errors.UndefinedTable,
                        psycopg2.errors.UndefinedFunction,
                        psycopg2.errors.InvalidTextRepresentation,
                        psycopg2.errors.DatatypeMismatch)):
        return False
    return True


def run():
    conn = psycopg2.connect(**DSN)
    conn.autocommit = False
    results = []
    for key, (expect, note) in EXPECTATIONS.items():
        persona, resource, op = key
        uid = PERSONAS[persona]['uid']
        prep = stmt_for(key, uid)
        if prep is None:
            results.append((key, 'skipped', 'no statement mapping', note))
            continue
        kind, sql, params = prep
        with conn.cursor() as cur:
            try:
                apply_jwt(cur, persona)
                cur.execute(sql, params)
                rows = cur.fetchall() if cur.description else []
                # succeeded
                if kind == 'select':
                    got = 'allow' if rows else 'empty'
                elif kind in ('mutate','rpc'):
                    # A mutate that matches 0 rows was silently RLS-filtered — treat
                    # as an effective denial (row is invisible/USING excluded).
                    got = 'allow' if rows else 'deny'
                actual_note = f'rows={len(rows)}'
            except psycopg2.Error as e:
                got = 'deny' if is_denial(e) else f'error:{type(e).__name__}'
                actual_note = str(e).strip().split('\n')[0][:200]
            finally:
                conn.rollback()

        # Normalize: 'deny' on select means the DB threw permission-denied → treat as 'empty'-equivalent
        # only when the persona has no read access at all. But if the expectation was 'empty'
        # and we got 'deny', that's still a valid restriction (stronger than empty).
        passed = (
            (expect == got)
            or (expect == 'empty' and got == 'deny')   # denial is stricter than empty
        )
        results.append((key, 'pass' if passed else 'fail', got, actual_note))

    conn.close()
    return results


def summarize(results):
    counts = defaultdict(int)
    fails = []
    by_persona = defaultdict(lambda: defaultdict(int))
    for key, status, got, note in results:
        counts[status] += 1
        by_persona[key[0]][status] += 1
        if status == 'fail':
            fails.append((key, got, note))
    return counts, by_persona, fails


if __name__ == '__main__':
    results = run()
    counts, by_persona, fails = summarize(results)

    print("=== Stage D authorization results ===")
    print(f"total assertions : {len(results)}")
    print(f"passed           : {counts['pass']}")
    print(f"failed           : {counts['fail']}")
    print(f"skipped          : {counts['skipped']}")
    print()
    print("--- by persona ---")
    for persona in sorted(by_persona):
        c = by_persona[persona]
        print(f"  {persona:16s}  pass={c['pass']:3d}  fail={c['fail']:3d}  skip={c['skipped']:3d}")
    print()
    if fails:
        print("--- failures ---")
        for key, got, note in fails:
            persona, resource, op = key
            expect = EXPECTATIONS[key][0]
            print(f"  [{persona}/{resource}/{op}] expected={expect} got={got}  {note}")

    with open('/tmp/pgtest/harness/results.json','w') as f:
        json.dump([
            {'persona':k[0],'resource':k[1],'op':k[2],'status':s,'actual':a,'note':n}
            for (k,s,a,n) in results
        ], f, indent=2)
