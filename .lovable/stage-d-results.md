# Stage D authorization verification — E1-a results (post-remediation)

**Stage D verdict: GREEN (harness-executable scope).** External integration suites (storage-object policies, realtime subscription events) remain unexecuted and are NOT counted as passes — they must be run against live Supabase Storage and Realtime before Stage D is declared fully green.

## Execution summary

| metric | value |
|---|---|
| assertions executed | **115** |
| passed | **115** |
| failed | **0** |
| skipped | 0 |
| unexecuted external integrations | **2** (storage-object policies, realtime subscription events) |

Full per-assertion results with actual outcomes: `.lovable/results.json` (also emitted to `/tmp/pgtest/harness/results.json` at run time).

## Per-persona pass/fail

| persona | pass | fail |
|---|---|---|
| owner_a | 13 | 0 |
| admin_a | 8 | 0 |
| dentist_a | 19 | 0 |
| hygienist_a | 8 | 0 |
| assistant_a | 6 | 0 |
| frontdesk_a | 6 | 0 |
| billing_a | 7 | 0 |
| auditor_a | 10 | 0 |
| dual_active_a | 2 | 0 |
| inactive_mem | 1 | 0 |
| clinic_c_mem | 2 | 0 |
| no_member | 2 | 0 |
| super_admin | 2 | 0 |
| support_agent | 1 | 0 |
| portal_a | 14 | 0 |
| anon | 14 | 0 |

## Remediations applied (this rerun only)

All applied via `supabase/migrations/20260723_stage_d_e1a_remediation` and harness updates. No policy weakening, no unrelated changes.

1. **Dropped 11 overlapping legacy permissive policies** on `patient_files`, `communications`, `clinic_settings`. Only the `staged_*` role-scoped policies remain, so RLS now enforces the Stage D role matrix on these tables. `auditor_a/patient_files_new/insert` now correctly denies.
2. **Sequence grants** — `GRANT USAGE, SELECT, UPDATE` on `invoices_number_seq`, `claims_number_seq`, `patients_chart_seq` to `authenticated`. The trigger-generated numbers (`set_invoice_no`, `set_claim_no`, `set_patient_chart_no`) now succeed for every authorized role. All four invoice-insert failures (owner/admin/billing/frontdesk) now pass.
3. **`submit_booking_request` repaired** — rewritten to insert into the actual `booking_requests` columns (`full_name`, `phone` NOT NULL, `preferred_date` + `preferred_time`) and split the incoming `timestamptz` at UTC. Public booking flow works end-to-end. `EXECUTE` limited to `anon, authenticated` (revoked from PUBLIC).
4. **Hygienist financial-read spec** — resolved to deny. `permissions.ts` does not grant `hygienist` the `billing.view` capability; the `staged_sel_invoices` policy already excludes hygienist. Spec updated in `.lovable/expected_matrix.py` to expect `empty` for `hygienist_a/invoices_clinic_a/select`.
5. **Portal TypeScript errors** — no errors present at HEAD (`bunx tsgo --noEmit` returns 0 diagnostics). The earlier `navigate({ to: '/portal', search: {} })` call is now valid because `/portal` has a `validateSearch` that accepts an empty object; the four Stage C errors previously flagged were resolved in an earlier turn.
6. **Forge-guard harness classifier** — the `_force_actor_created_by` and `_clinical_notes_sign_guard` triggers silently override caller-supplied `created_by`/`signed_by` to `auth.uid()`, which is *stricter* than raising. The harness now uses a CTE-based check: `WITH ins AS (INSERT ... RETURNING created_by) SELECT 1 FROM ins WHERE created_by = <forged_uid>` — a "deny" outcome is confirmed by the forged value **not** persisting, not by an exception. Expected permission specification unchanged (still "cannot forge"); only the assertion mechanics were corrected. Both `dentist_a/clinical_note_forge_*` assertions now pass.

## Unexecuted external integrations (NOT passes)

1. **Storage object policies (`clinic-files` bucket).** The SQL harness verifies policies exist on `storage.objects`, but real upload/download/delete requires the Supabase Storage HTTP API. Marked unexecuted.
2. **Realtime subscription events.** The `supabase_realtime` publication is present and every enabled table retains its Stage D RLS policies (so subscribed rows follow the same USING clauses). Actual cross-clinic subscription observation requires a running Realtime server. Marked unexecuted.

Neither is counted as a pass. Stage D is not "fully green" until both run against a live environment.

## Type-check & production build

- `bunx tsgo --noEmit` → **0 diagnostics**.
- `bun run build` → **passes** (nitro output generated).

## Environment & safety (unchanged)

- Ephemeral local Postgres 15 at `/tmp/pgtest`, port `55432`. Never connected to a managed database.
- Every assertion runs inside its own transaction that ends in `ROLLBACK`.
- Fixture-residue check: `inet_server_addr()` returns NULL (unix socket only) — no live-DB writes.
- Personas run under `SET LOCAL ROLE authenticated | anon` with `request.jwt.claims = {sub, role, email}`. `service_role` is never used for browser-persona assertions.

## Rerun instructions

```
export PGHOST=/tmp/pgtest PGPORT=55432 PGUSER=postgres
psql -d postgres -c "DROP DATABASE IF EXISTS testdb"
psql -d postgres -c "CREATE DATABASE testdb"
psql -d postgres -c "ALTER DATABASE testdb SET search_path TO public, extensions"
export PGDATABASE=testdb
psql -c "CREATE PUBLICATION supabase_realtime"
psql -1 -v ON_ERROR_STOP=1 -f .lovable/00_scaffold.sql
for f in supabase/migrations/*.sql; do psql -1 -v ON_ERROR_STOP=1 -f "$f"; done
psql -1 -v ON_ERROR_STOP=1 -f .lovable/seed.sql
python3 .lovable/test_runner.py
```

## Gate

E1-a targeted remediation is complete on the harness-executable scope. Do NOT proceed to E1-b until:
1. You confirm the results above.
2. The two unexecuted external suites (storage, realtime) are run against a live environment OR you explicitly accept them as out-of-scope for E1-a.
