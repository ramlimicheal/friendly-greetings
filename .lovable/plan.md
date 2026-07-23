
# Enamel — Read-only Audit (HEAD)

Scope: no code was changed. Every finding cites a file/line, symbol, or SQL policy verified in this pass. Anything not verified is marked UNVERIFIED.

Verified inventory: 30 public tables (all with RLS enabled), 1 private storage bucket `clinic-files` with 4 storage policies, 13 SECURITY DEFINER functions, `_authenticated/route.tsx` gate, `staff.functions.ts`/`platform.functions.ts`/`comms.functions.ts`/`ai.functions.ts` server fns, public routes `/`, `/auth`, `/book`, `/portal`, `/sitemap.xml`.

---

## P0 — Ship-stopping security / data-integrity

### P0-1 Cross-tenant leak of every staff account (name + email) to any signed-in user

- Where: `pg_policies.profiles` policy `"Authenticated users can view profiles"` — `USING true` for role `authenticated`. Read by `src/hooks/use-auth.ts` and `src/lib/staff.functions.ts:41`.
- Exploit: any authenticated account, including a patient-portal user in Clinic A, runs `select id,email,full_name,avatar_url,is_active from profiles` and gets the full staff directory of every clinic on the platform.
- Fix (smallest): replace `USING true` with a same-clinic predicate, e.g. `EXISTS (SELECT 1 FROM clinic_members m1 JOIN clinic_members m2 ON m1.clinic_id=m2.clinic_id WHERE m1.user_id=auth.uid() AND m2.user_id=profiles.id AND m1.is_active AND m2.is_active) OR is_super_admin(auth.uid()) OR profiles.id = auth.uid()`.

### P0-2 Cross-tenant leak of every clinic's services list to the internet

- Where: `pg_policies.services` policy `"public read active services"` — `USING true` for role `anon`. Consumed by `src/lib/booking-api.ts:14 listActiveServices`.
- Exploit: `curl` against PostgREST `/rest/v1/services?select=*` with the publishable key (baked into the client) returns every service, price, default provider, description, and clinic_id for every tenant. Enables competitive intel + targeted spam.
- Fix: constrain the anon SELECT to a chosen public clinic — e.g. `active AND clinic_id = <requested clinic>` via an RPC that takes a clinic slug, or require an unauthenticated `clinic_slug` query param and add `slug` predicate; keep only a "public bookable" flag.

### P0-3 Public booking + intake actually don't work multi-tenant (records stranded / insert fails)

- Where: `booking_requests.clinic_id` and `intake_forms.clinic_id` are `NOT NULL DEFAULT current_clinic_id()` (verified via `information_schema.columns`). `current_clinic_id()` reads `profiles.active_clinic_id WHERE id = auth.uid()`; called from an anon session it returns NULL, and `src/routes/book.tsx` never sets `clinic_id` before calling `submitBookingRequest`/`submitIntakeForm` (`src/lib/booking-api.ts:26,36`).
- Failure: every public booking should either 500 on NOT-NULL or, if a default fires, land with a NULL clinic_id that no staff SELECT policy matches (`is_clinic_member(auth.uid(), clinic_id)` — NULL fails). Nobody sees the request. This is presented in the UI as a working feature and in migrations as a launched flow.
- Fix (smallest): (a) require `clinic_slug`/`clinic_id` on `/book` and pass it in the insert; (b) add an anon-callable `SECURITY DEFINER` RPC `public_submit_booking(clinic_slug, …)` that resolves clinic and inserts; (c) tighten anon INSERT policy to `WITH CHECK (clinic_id IS NOT NULL AND EXISTS(SELECT 1 FROM clinics c WHERE c.id = clinic_id AND c.is_active))`.

### P0-4 Global "admin" app_role bypasses clinic tenancy entirely

- Where: dual role model. `src/lib/permissions.ts` uses `ClinicRole` scoped by `clinic_members`, but `src/lib/staff.functions.ts:25 assertAdmin` gates on `user_roles.role = 'admin'` (schema-global `app_role`, no clinic). `updateStaffRole`/`setStaffActive` then call `supabaseAdmin` (`client.server.ts`, bypasses RLS) with `.eq("user_id", data.user_id)` — no membership check against caller's clinic.
- Exploit: any user holding a single global `admin` `app_role` row can (a) promote themselves/others to admin, (b) deactivate any user on the platform including owners of other tenants. `pg_policies.user_roles."Admins can manage roles"` (`USING has_role(auth.uid(),'admin')`) reinforces the same bypass at DB level.
- Fix (smallest): (1) delete the `admin` short-circuit in `assertAdmin`; require `has_clinic_role(auth.uid(), <clinic_id from input>, ['owner','admin'])` and pass `clinic_id` explicitly on every mutation. (2) Scope `user_roles` policies to same-clinic actors. (3) Prefer collapsing to the clinic_role model — the `app_role` model appears vestigial.

### P0-5 First-signup-becomes-admin bootstrap can be re-triggered

- Where: `public.handle_new_user()` (SECURITY DEFINER). If `select count(*) from user_roles = 0`, the new signup is inserted with `role='admin'`.
- Exploit: on a fresh remix, on a project where all `user_roles` rows have been deleted, or on any pathway that transiently empties the table, the next sign-up (open Google OAuth or `/auth?bootstrap=1` — `src/routes/auth.tsx:40`) becomes a platform admin. Combined with P0-4, that grants full cross-tenant control.
- Fix: replace the count-based bootstrap with a one-shot env-gated invitation (`INITIAL_ADMIN_EMAIL`) or a Cloud migration that seeds the first admin explicitly, then drop the branch. Also require email confirmation (see P0-6).

### P0-6 Portal auto-link on any email match — patient impersonation

- Where: `handle_new_user()` branch when no invitation and roles exist: it looks up `patients.email = new.email` (case-insensitive, ANY clinic) and inserts a `patient_portal_users` row for that user_id → patient_id → clinic_id. `patient_portal_users` has no `INSERT` RLS (only 2 SELECT policies), so this only happens through the trigger.
- Exploit: attacker signs up on `/portal` with a target patient's email. If Supabase email confirmation is not enforced (UNVERIFIED — not visible from schema; must confirm via auth settings), the trigger runs during the signUp itself and the attacker gains portal access to the target's chart, appointments, invoices, and treatment plan items (all Portal RLS policies use `current_portal_patient_id()` which comes from this row). Even with confirmation, phishing an unclicked email is enough because the trigger fires on the initial insert into `auth.users`, before verification in many configurations.
- Fix: (a) only link after `email_confirmed_at IS NOT NULL` — move the link from `handle_new_user` to a trigger on `auth.users` UPDATE when confirmation happens, or gate via `NEW.email_confirmed_at IS NOT NULL`. (b) Match on `email + date_of_birth` or a one-time invite token issued by staff (`patient_portal_invites` table). (c) Require staff to explicitly enable portal per patient.

### P0-7 Any authenticated user can create organizations/clinics under any org

- Where: `pg_policies.organizations` INSERT `WITH CHECK (auth.uid() IS NOT NULL)`; `pg_policies.clinics` INSERT `WITH CHECK (is_super_admin(auth.uid()) OR (auth.uid() IS NOT NULL))`. `clinics.organization_id` is not restricted to the caller's own org.
- Exploit: (1) tenant sprawl / spam by portal users. (2) A malicious authenticated user can create a `clinic` row under someone else's `organization_id`; that clinic is then visible to the target org's SELECT policy `org visible to members` — polluting the target org's clinic list and (via the "clinic insert" itself calling `current_clinic_id`/other DEFAULTS) potentially poisoning routing.
- Fix: `organizations` INSERT — restrict to service_role or an onboarding RPC. `clinics` INSERT — `WITH CHECK (is_super_admin(auth.uid()) OR is_org_creator(auth.uid(), organization_id))` and remove `auth.uid() IS NOT NULL` fallback.

### P0-8 Storage: all clinic members (including read_only_auditor and front_desk) can download AND delete any patient file

- Where: bucket `clinic-files`; storage policies (verified) key only on `is_clinic_member(auth.uid(), split_part(name,'/',1)::uuid)` for SELECT/INSERT/UPDATE/DELETE. Table `patient_files` policies mirror this: SELECT/INSERT/UPDATE/DELETE all use `is_clinic_member(...)` — no role filter.
- Exploit: front desk, hygienists, auditors, and any active member can delete X-rays and consent PDFs, and download every patient's chart uploads regardless of clinical role.
- Fix: gate DELETE on `has_clinic_role(auth.uid(), clinic_id, ARRAY['owner','admin','dentist'])`; consider gating SELECT for `read_only_auditor` behind an audit-log trigger, and adding a `soft_deleted_at` column with an admin-only hard delete.

### P0-9 `updateStaffRole` writes app_role for any user_id — no tenancy check at all

- Where: `src/lib/staff.functions.ts:122-142 updateStaffRole` — after `assertAdmin` (see P0-4) it calls `supabaseAdmin.from('user_roles').delete().eq('user_id', data.user_id)` and inserts a new role. There is no check that `data.user_id` belongs to the caller's clinic.
- Exploit: even if P0-4 is fixed, this endpoint still lets a "clinic A admin" change roles of a "clinic B" user because `user_roles` is not clinic-scoped and the mutation is not scoped either.
- Fix: replace with clinic-scoped `clinic_members.role` mutation and require both the actor and target to be members of the same clinic (`has_clinic_role(caller, clinic_id, ['owner','admin']) AND is_clinic_member(target, clinic_id)`); do it through the RLS-scoped `context.supabase`, not `supabaseAdmin`.

---

## P1 — Serious integrity / usability

### P1-1 Race conditions in scheduling and billing (silent double-book and wrong balance)

- Appointments: `src/lib/appointments-api.ts:128 rescheduleAppointment` and `checkAppointmentConflict` — TOCTOU. Two staff drag onto the same slot; both conflict checks pass, both updates commit. No `EXCLUDE USING gist(tstzrange(...) WITH &&)` constraint on `appointments`; only a helper RPC.
- Payments: `src/lib/billing-api.ts:118 recordPayment` reads `sum(payments.amount)` client-side, then writes `invoices.amount_paid`. Concurrent inserts race and one write wins. `refreshPatientBalance` has the same shape at patient level.
- Fix: (a) add `ALTER TABLE appointments ADD CONSTRAINT no_overlap EXCLUDE USING gist (chair WITH =, provider WITH =, tstzrange(start_at, start_at + make_interval(mins => duration_min)) WITH &&) WHERE (status NOT IN ('cancelled','no-show'))`. (b) compute invoice/patient balances in DB functions/triggers on `payments` insert.

### P1-2 Portal users authenticated as `authenticated` role can enumerate ALL staff (P0-1) AND likely all patient_portal_users rows

- Where: `pg_policies.patient_portal_users` — SELECT allowed if `is_clinic_member(auth.uid(), clinic_id)` OR `user_id = auth.uid()`. A staff member sees every portal link in their clinic (fine). No cross-tenant leak here. But paired with P0-1, portal users see all staff.

### P1-3 `impersonateClinic` has no exit and no time bound

- Where: `src/lib/platform.functions.ts:173 impersonateClinic`. Sets `profiles.active_clinic_id` for the super_admin permanently. Audit-logged, but there is no automatic revert, no "impersonation banner" UI, and no way to distinguish an impersonation session from a normal one in `audit_log` writes originating from within the impersonated clinic.
- Fix: introduce `profile_impersonation` table with `expires_at`, wrap RLS lookups behind `current_clinic_id()`, and tag audit entries with an `impersonating=true` flag; render a persistent banner in `app-shell`.

### P1-4 Global `switchClinic` triggers full window reload — data loss risk

- Where: `src/hooks/use-clinic.ts:81 window.location.reload()`. Any in-progress form (unsaved patient/appointment/invoice) is silently discarded on switch. Frequent multi-clinic staff will lose work.
- Fix: after `update profiles`, invalidate all react-query caches (`queryClient.clear()` + `queryClient.invalidateQueries()`) and navigate to `/dashboard`.

### P1-5 Public booking is an open spam sink

- Where: `pg_policies.booking_requests` INSERT anon `WITH CHECK true`. No captcha, no rate-limit, no honeypot, no per-clinic ban list; combined with P0-3 the endpoint is either broken or wide-open. `service_id` isn't validated against the clinic either.
- Fix: move public submissions to an RPC/server function that (a) verifies a captcha token (Turnstile/hCaptcha), (b) enforces per-IP + per-email rate limits via a table, (c) validates `service_id → clinic_id` matches, (d) writes the row.

### P1-6 `handle_new_user` misroutes staff who share an email with a patient

- Where: same trigger — the "no roles yet, count>0" branch links to a matching patient. A dentist whose personal email is also on file as a patient will be linked as a portal user (no staff role) and the `_authenticated/route.tsx:38-48` gate will bounce them to `/portal` forever.
- Fix: change trigger to skip patient linking when the signup was via an invitation OR when the profile is later granted a `clinic_members` row; unlink automatically on staff invitation acceptance.

### P1-7 Portal login flow doesn't verify the account is actually a portal user

- Where: `src/routes/portal.tsx:33` — trusts `supabase.auth.getUser()` then queries `patient_portal_users`. If the user has no link, shows "we couldn't find your patient record" — but a staff user visiting `/portal` sees that same screen. Not a leak, but confusing UX and a phishing surface (attackers can build a fake portal that mimics this state).

### P1-8 `booking_requests` public policy allows anon to `INSERT` but there is no visibility scoping on `patient_id`/`appointment_id` fields — anon can seed arbitrary FKs

- Where: policy `WITH CHECK true` doesn't restrict what columns the anon writer sets. `submitBookingRequest` accepts a full `BookingRequestInsert` including `patient_id` and `appointment_id`.
- Exploit: not directly exploitable to read data (no returning), but poisons the staff triage screen and can create ambiguous FK linkages that confuse the "convert to patient" flow.
- Fix: RPC-based submission that whitelists the allowed columns.

### P1-9 `sitemap.xml` — UNVERIFIED

- File exists (`src/routes/sitemap[.]xml.ts`) but not read in this pass. Verify it does not enumerate patient- or clinic-specific URLs. Confirm before shipping.

---

## P2 — Correctness, polish, presented-as-real mocks

- P2-1 `/book` renders hardcoded providers ("Dr. Patel", "Dr. Kim") and a hardcoded phone "(555) 123-4567" (`src/routes/book.tsx:43,247-249`). These are mocks presented as real; misleads patients across all tenants.
- P2-2 `printStatement`/`printAdaClaim` default the clinic block to `"Enamel Dental Clinic … NPI 1234567890 TIN 12-3456789"` (`src/lib/billing-print.ts:50,114`). Real print jobs will ship those placeholders unless every caller passes overrides — verify all callers do (UNVERIFIED here).
- P2-3 `src/hooks/use-auth.ts` defines only 4 `AppRole`s (`admin|dentist|hygienist|front_desk`), but `permissions.ts` defines 8 `ClinicRole`s. Two parallel role models silently drift; the auth hook can't represent `assistant`, `billing_specialist`, `read_only_auditor`, `owner`. UI role checks that read `useAuth().roles` will never see these.
- P2-4 `staff.tsx:196` — single-select role UI wipes all existing roles per `updateStaffRole` ("simple model"). No warning to admin, silent loss.
- P2-5 `_authenticated/route.tsx` runs auth check in `useEffect`, so protected pages render an empty div then flash — no skeleton, no fallback while `getUser()` + `profiles` + `patient_portal_users` + `clinic_members` round-trip. Feels broken on slow networks.
- P2-6 `/portal` uses `supabase.auth.signUp({emailRedirectTo: origin/portal})` — new patients accidentally get redirected into an app they don't have access to yet if the linkage hasn't happened. Should hold on a "check your email" state until confirmed and linked.
- P2-7 `src/lib/ai.functions.ts` `draftSoapNote` requires 5-char transcript — SOAP notes are PHI; the AI gateway request contains the transcript in plaintext and could be logged upstream. Add an explicit HIPAA/BAA notice at the dictation UI and/or route through a self-hosted model.
- P2-8 Password minimum length is 6 in `/auth` and `/portal` — below common standards. Also HIBP leaked-password protection status UNVERIFIED — enable via `configure_auth`.
- P2-9 `useAuth`'s `isAdmin`/`isClinical` helpers derive from platform `app_role`, not from `clinic_role`. Any UI conditional using them (e.g. rendering platform links) will show/hide the wrong things when a user has both.
- P2-10 `sendCommunication` inserts a queued row, then updates it after send. If the app crashes between insert and update, rows stay `status='queued'` forever. No worker/reconciler.
- P2-11 `patient_files-api.ts:74 getSignedFileUrl` uses 5-minute expiry — fine. But downloaded URLs may end up in browser history/analytics; consider adding `download` disposition and short expiry only on click.
- P2-12 `booking_requests` has no unique/soft-dedup — same patient submitting twice creates two rows; front desk workflow degrades.

---

## P3 — Type safety, tests, a11y, dead code

- P3-1 Server functions use `any` widely (`staff.functions.ts:25`, `platform.functions.ts:30/47/59` etc.) — losing type safety exactly where trust boundaries live.
- P3-2 No unit or e2e tests in the repo (verified: no `*.test.*` / `*.spec.*` under `src/`; UNVERIFIED for e2e). No CI check for RLS regressions.
- P3-3 Dead/duplicate branding assets and near-duplicate landing sections in `src/routes/index.tsx` (698 lines, single file). Split candidates: `hero`, `feature-panel`, `pricing`, `faq`, `footer`.
- P3-4 A11y: modals in `src/components/*-dialog.tsx` and `staff.tsx:340` are custom `<div>` overlays — no focus trap, no ESC-to-close, no `aria-modal` / role="dialog", background not `inert`. Icon-only buttons in tables lack `aria-label` (e.g. `X` close, `Copy`).
- P3-5 Empty/loading/error states: many routes show only "Loading…" text (`staff.tsx:75`), no skeleton, no retry button. Error paths mostly `alert()` or inline text; toasts inconsistent.
- P3-6 Mobile: `platform.clinics.tsx`, `staff.tsx`, `billing.tsx` etc. use wide `overflow-x-auto` tables; on mobile the entire viewport horizontal-scrolls. `schedule.tsx` chair grid is unreadable at <640px (UNVERIFIED at HEAD).
- P3-7 Supabase linter (20 WARN): 1× "RLS policy always true" (P0-2 above), and 19× "SECURITY DEFINER functions callable by anon/authenticated" — most are intentional helpers (`has_role`, `is_clinic_member`, `current_clinic_id`) but `handle_new_user` is intentionally exposed to `authenticated` — verify none can be called with attacker-controlled args to leak data.
- P3-8 `src/lib/mock-data.ts` present — verify no route ships this to prod (UNVERIFIED which routes import it).
- P3-9 `book.tsx` reveals FK/insert errors verbatim via `err instanceof Error ? err.message` (line 194). Postgres constraint messages can leak table/column names.
- P3-10 `getInvitationByToken` is an unauthenticated server function returning `{email, role}` — token-guessing is only bounded by 128-bit token entropy; verify tokens are 128-bit random and the endpoint has abuse rate limiting (UNVERIFIED).

---

## Staged fix plan (Stage 1 = P0/P1 security + integrity only, no product work)

Stage 1 — Lockdown (do these before anything else):

1. **Multi-tenant read leaks** — replace `profiles` "authenticated USING true" and `services` anon "USING true" policies (P0-1, P0-2).
2. **Public booking correctness + safety** — introduce `public_submit_booking(clinic_slug, …)` RPC, drop the anon `WITH CHECK true` INSERTs on `booking_requests`/`intake_forms`, add captcha + rate limit table, and pass `clinic_id` from `/book` (P0-3, P1-5, P1-8).
3. **Kill the global-admin bypass** — remove `assertAdmin`'s `user_roles.admin` gate, require `has_clinic_role(caller, clinic_id, ['owner','admin'])` on every staff mutation, and stop using `supabaseAdmin` for role writes. Rewrite `updateStaffRole`/`setStaffActive` around `clinic_members` (P0-4, P0-9).
4. **Bootstrap** — replace the "first signup becomes admin" branch with an env/invite-driven seed (P0-5).
5. **Portal linking hardening** — require confirmed email + secondary identifier (DOB or one-time invite token) before creating `patient_portal_users`; move link creation out of `handle_new_user` (P0-6, P1-6).
6. **Tighten `organizations`/`clinics` INSERT** — restrict `organizations` to service_role/onboarding RPC; require `is_org_creator` on `clinics` INSERT (P0-7).
7. **Storage & `patient_files` role gating** — restrict DELETE to owner/admin/dentist; consider audit-log trigger on SELECT of X-rays (P0-8).
8. **Race conditions** — add appointment `EXCLUDE` constraint; move invoice/patient balance to DB triggers (P1-1).
9. **Impersonation UX + expiry** — add expiring impersonation record, banner, and audit tagging (P1-3).
10. **Clinic switcher** — replace hard reload with react-query cache reset + navigate (P1-4).

Stage 2 — Correctness & UX (P2): mock-data purge, dual-role-model collapse, HIBP + password length, dictation PHI notice, dialog a11y (P3-4), consistent loading/error/empty states, mobile schedule/table layouts.

Stage 3 — Engineering quality (P3): remove `any` in server fns, add RLS regression tests (a small suite that spawns two tenants and asserts read isolation), split the 698-line landing page, wire `dependency_scan` to CI.

---

## Assumptions / UNVERIFIED items to confirm before Stage 1 lands

- Whether Supabase email confirmation is currently enforced (governs P0-6 severity).
- `sitemap.xml.ts` contents (P1-9).
- `invitations.token` entropy and any rate-limit around `getInvitationByToken` (P3-10).
- Whether any production callers of `printStatement`/`printAdaClaim` rely on the placeholder clinic defaults (P2-2).
- The full contents of `book.tsx` after line 440 (consent + signature block) — audit read only the first 440 lines.
- Whether `src/lib/mock-data.ts` is imported by any shipped route (P3-8).

Nothing above was changed; all diagnoses cite artifacts read this turn or SQL policies verified via `pg_policies`/`information_schema`.
