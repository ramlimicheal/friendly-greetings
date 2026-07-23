# Stage D authorization verification — E1-a results

**Stage D verdict: FAILED (halt before E1-b).**

## Execution summary

| metric | value |
|---|---|
| assertions executed | **115** |
| passed | **106** |
| failed | **9** |
| skipped | 0 |
| unexecuted external integrations | **2** (storage-object policies, realtime subscription events) |

Per-persona pass/fail breakdown is in `.lovable/results.json`. All assertions ran; every persona was exercised, including anonymous, portal, super-admin without membership, support-agent, dual-clinic member, inactive membership, member of inactive clinic, and profile-only "no membership" user.

## Environment & safety

- Ephemeral local Postgres 15 cluster at `/tmp/pgtest` on port `55432`. Not connected to any live/managed database.
- Migrations applied against a fresh `testdb` using the checked-in `supabase/migrations/*.sql` in order, on top of a minimal `auth`/`storage` scaffold (`.lovable/00_scaffold.sql`) that provides `auth.users`, `auth.uid()`, `auth.jwt()`, roles `anon`/`authenticated`/`service_role`, and the `supabase_realtime` publication.
- Fixtures live in `.lovable/seed.sql`; every value is prefixed `test_*` or lives under a synthetic `test-clinic-*` slug. IDs are stable UUIDs, all names/emails synthetic.
- **Every assertion runs inside its own transaction that always ends with `ROLLBACK`.** No test-time mutation is ever committed. The only committed data is the initial synthetic seed inside the ephemeral DB.
- **Fixture residue check:** confirmed the harness never touched a live database — connection stayed on the local unix socket (`inet_server_addr() IS NULL`). No live-DB writes.
- Assertions run under `SET LOCAL ROLE authenticated | anon` with `request.jwt.claims` set to `{sub, role, email}` per persona; `service_role` is never used for assertions meant to represent a browser user.

## Independent expected-permission spec

`.lovable/expected_matrix.py` encodes the expected outcomes from the canonical Stage D role requirements (roadmap + directive), not from the current policies. Any drift between the spec and DB behavior is a defect in one or the other, called out below.

## Failures (grouped)

### P0 — Stage D policies are being bypassed by surviving legacy policies

Three tables have BOTH the Stage D `staged_*` role-scoped policies AND the pre-Stage-D permissive `is_clinic_member()` policies live simultaneously. Postgres RLS is permissive across policies, so the legacy policies **grant every clinic member all four CRUD operations**, silently disabling the Stage D role matrix on:

- `public.patient_files` — 4 legacy policies (`Clinic members can view/insert/update/delete patient files`) coexist with `staged_sel/ins/upd/del_patient_files`
- `public.communications` — same pattern (4 legacy + 4 staged)
- `public.clinic_settings` — same pattern (3 legacy + 4 staged)

Concrete failed assertion:

- `[auditor_a/patient_files_new/insert] expected=deny got=allow` — a `read_only_auditor` successfully inserted a `patient_files` row because the legacy `Clinic members can insert patient files` INSERT policy still exists.

**Impact:** Stage D authorization on files, communications, and clinic settings is effectively non-existent for any clinic member. Auditor-can-write is only one visible symptom; billing_specialist can also mutate clinical files, front_desk can mutate communications, etc.

**Cause:** the Stage D migration installed the new policies alongside the old ones instead of dropping the legacy set first.

**Remediation:** in a follow-up migration, drop the 11 named legacy policies on those three tables. Do not modify the `staged_*` policies. No policy weakening.

### P0 — Sequence grants missing → invoice creation broken for every authorized role

- `[owner_a/invoices_new/insert] expected=allow got=deny  permission denied for sequence invoices_number_seq`
- `[admin_a/invoices_new/insert]  expected=allow got=deny  permission denied for sequence invoices_number_seq`
- `[billing_a/invoices_new/insert] expected=allow got=deny  permission denied for sequence invoices_number_seq`
- `[frontdesk_a/invoices_new/insert] expected=allow got=deny  permission denied for sequence invoices_number_seq`

The `set_invoice_no` BEFORE-INSERT trigger calls `nextval('public.invoices_number_seq')`, but the sequence has zero access privileges. Triggers run as invoker; `authenticated` therefore cannot bump the sequence and every invoice insert fails. `patients_chart_seq` and `claims_number_seq` have the same shape and are almost certainly affected identically.

**Impact:** Every financial write (invoice creation, and by extension the invoice-numbered dependent flows) is broken for authenticated users. This is a hard functional regression from Stage D onward that the earlier acceptance checks did not exercise.

**Remediation:** `GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.invoices_number_seq, public.claims_number_seq, public.patients_chart_seq TO authenticated;` (or move the `nextval` calls into `SECURITY DEFINER` helpers). Preferred: grant, since the trigger is already the authorization boundary.

### P0 — `submit_booking_request` references non-existent columns

- `[anon/rpc.submit_booking_request/call] expected=allow got=error:UndefinedColumn  column "patient_name" of relation "booking_requests" does not exist`

`public.submit_booking_request` inserts into `booking_requests (patient_name, email, phone, preferred_at, reason)`, but the table columns are `full_name, phone, preferred_date, preferred_time, reason` (email/preferred_at do not exist).

**Impact:** The public booking flow is 100% broken end-to-end — every `/book` submission fails immediately. This is not a Stage D authorization defect per se, but Stage D moved this behind an RPC and shipped the RPC in a broken state.

**Remediation:** rewrite the RPC to match the current table shape (split `_preferred_at` into date+time, drop `email` or add it to the table with a follow-up migration, use `full_name`). Either fix is a migration; either way the RPC and the table must agree.

### P1 — Spec vs implementation drift (not a Stage D regression, but recorded)

- `[hygienist_a/invoices_clinic_a/select] expected=allow got=empty`
  The canonical roadmap allows clinicians to view financials. The staged SELECT policy on `invoices` lists `{owner,admin,billing_specialist,front_desk,dentist,read_only_auditor}` — hygienist is intentionally omitted. Either the spec should exclude hygienist from financial reads or the policy should include hygienist. Decision needed before E1-b; the current DB behavior is internally consistent.

### Accepted-deviation (harness expectations refined) — not defects

- `[dentist_a/clinical_note_forge_created_by/insert]` — insert succeeded, but the `_force_actor_created_by` BEFORE trigger overrides `NEW.created_by := auth.uid()`. The forged value never persists. This is *safer* than raising, and matches the spec goal ("users cannot forge created_by") — the harness treats a silent server-side override as a pass in the follow-up rerun.
- `[dentist_a/clinical_note_forge_signed_by/insert]` — same shape via `_clinical_notes_sign_guard` which overrides `NEW.signed_by := auth.uid()` whenever `signed_at` is set on INSERT/UPDATE. Safe.

Both are being kept in the matrix so that any future change that removes the trigger override immediately fails the suite; the harness classifier will be extended to post-check the persisted actor column rather than expect an exception.

## Not executed (must remain unexecuted-not-passed)

1. **Storage object policies (`clinic-files` bucket).** The SQL harness can assert `storage.objects` policy rows, but exercising real object read/upload/delete requires the Supabase Storage API. Marked unexecuted; must run as an integration test against a real Storage endpoint before Stage D is declared green.
2. **Realtime subscription events.** The harness confirmed `supabase_realtime` publication exists and enabled tables retain RLS-compatible policies (the same policies that gate SELECT). Actual cross-clinic event isolation (Clinic A subscriber must not receive Clinic B events) requires a live Realtime server; marked unexecuted.

Neither of these is counted as a pass.

## Type-check & production build

- `bunx tsgo --noEmit`: **4 pre-existing TypeScript errors** in `src/routes/portal.tsx` (Stage C artefact — `navigate({ to: '/portal', ... })` calls omit the required `search`/`params` reducer). Not caused by E1-a. Recorded here so it is not confused with harness output.
- `bun run build`: **passes** (`✓ built in 923ms`, nitro output generated).

## Deliverables checked in

- `.lovable/00_scaffold.sql` — minimal `auth`/`storage` scaffold + roles.
- `.lovable/seed.sql` — synthetic fixtures (16 personas, 3 clinics, all operational rows).
- `.lovable/expected_matrix.py` — independent expected-permission spec, 115 assertions.
- `.lovable/test_runner.py` — psycopg2-based runner, one-transaction-per-assertion with rollback.
- `.lovable/results.json` — machine-readable per-assertion results.

## Rerun instructions

```
# 1. Start an ephemeral local cluster (only needed once per sandbox)
initdb -D /tmp/pgtest -U postgres --auth-local=trust
pg_ctl -D /tmp/pgtest -o "-k /tmp/pgtest -p 55432" -l /tmp/pgtest/log start

# 2. Rebuild the test DB from checked-in artifacts + current migrations
export PGHOST=/tmp/pgtest PGPORT=55432 PGUSER=postgres
psql -d postgres -c "DROP DATABASE IF EXISTS testdb"
psql -d postgres -c "CREATE DATABASE testdb"
psql -d postgres -c "ALTER DATABASE testdb SET search_path TO public, extensions"
export PGDATABASE=testdb
psql -c "CREATE PUBLICATION supabase_realtime"
psql -1 -v ON_ERROR_STOP=1 -f .lovable/00_scaffold.sql
for f in supabase/migrations/*.sql; do psql -1 -v ON_ERROR_STOP=1 -f "$f"; done
psql -1 -v ON_ERROR_STOP=1 -f .lovable/seed.sql

# 3. Run the suite
python3 .lovable/test_runner.py
```

## Do not proceed to E1-b

Three P0 defects (legacy-policy bypass on files/communications/clinic_settings, missing sequence grants breaking every invoice write, broken `submit_booking_request` RPC) and one P1 spec drift must be triaged before Stage D can be declared green and E1-b (SECURITY DEFINER cleanup) begins. Awaiting approval on the recommended remediations.
