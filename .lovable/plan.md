# Curelo / Enamel — Core Product Plan

Goal: turn what we have into a **market-ready, multi-tenant dental practice management SaaS**. Below is (1) a brutally honest audit of where we are, (2) the target product shape, (3) the role model to the core, (4) the patient/client journey, (5) the build sequence with test cases per slice.

---

## 1. Where the app actually is today

| Area | Status | Real / Mock | Notes |
|---|---|---|---|
| Auth (email + Google) | Working | Real | Invite-only, first user = admin |
| Roles (admin/dentist/hygienist/front_desk) | Working | Real | Single-clinic only, no super admin |
| Patients CRUD | Working | Real | Seeded 5 demos |
| Odontogram | Working | Real | Anatomical SVG, daily snapshots |
| Treatment plans + fee schedule | Working | Real | Phases, items, accept flow |
| Clinical SOAP notes | Working | Real | Sign-to-lock |
| Appointments + schedule + realtime | Working | Real | Drag-reschedule, conflicts |
| Waitlist + auto-fill on cancel | Working | Real | |
| Recalls | Working | Real | |
| Public booking + intake | Working | Real | /book |
| Billing (invoices, payments, A/R, statements) | Working | Real | No Stripe |
| Insurance (plans, claims, ADA form, estimator) | Working | Real | Manual claim status |
| AI (dictation, benefits, plan explainer, no-show) | Working | Real | Lovable AI Gateway |
| Communications (SMS/email reminders) | **Missing** | — | Needs domain + Twilio |
| Multi-clinic / multi-location | **Missing** | — | Single tenant only |
| Super-admin / SaaS control plane | **Missing** | — | No tenant mgmt, no billing-of-clinics |
| Audit log surfaced in UI | Partial | Table exists | No viewer |
| Reports depth | Basic | Real | Only heatmap + a few KPIs |
| Inventory | Stub | Mock | Not wired |
| File storage (x-rays, docs, consent PDFs) | **Missing** | — | No bucket |
| Mobile responsive polish | Partial | — | Works, not optimized |
| Test coverage | **None** | — | No automated tests |

**Honest verdict:** feature-rich single-clinic MVP. **Not** market-ready yet — missing multi-tenant, comms, file storage, hardened permissions, and QA.

---

## 2. What "market-ready" means for this product

Target: **cloud dental PMS** competing with Dentrix Ascend / Curve / Denticon in the SMB clinic segment.

Must-have before selling:
1. **Multi-tenant** (each clinic = isolated data, own users, own settings)
2. **Super-admin control plane** (create clinics, suspend, view usage, billing)
3. **Per-clinic subscription + seat limits**
4. **File storage** (x-rays, intraoral photos, signed consents, insurance cards)
5. **Communications** (reminders, recalls, 2-way SMS)
6. **Audit log viewer** (HIPAA-adjacent — who did what, when)
7. **Data export / backup** per clinic
8. **Hardened RLS + role tests** (automated)
9. **Onboarding wizard** (new clinic in <10 min)
10. **Legal**: ToS, Privacy, BAA, cookie consent

---

## 3. Role model — to the core

### 3.1 Role hierarchy

```text
Platform (SaaS operator = us)
└── super_admin           create/suspend clinics, view all tenants, billing
    └── support_agent     read-only across clinics for support tickets

Clinic (tenant)
├── clinic_owner          full control of ONE clinic, billing, staff, settings
├── admin                 staff mgmt, settings, all clinical + financial
├── dentist               own + shared schedule, clinical write, Rx
├── hygienist             clinical write (limited), own schedule
├── assistant             clinical read + limited write (assist notes)
├── front_desk            scheduling, check-in, payments, no clinical write
├── billing_specialist    invoices, claims, payments, no clinical
└── read_only_auditor     read everything, write nothing (for accountants/insurers)
```

Current app has 4 roles → expand to **9**, plus **2 platform roles**.

### 3.2 Permission matrix (summary)

| Capability | super | support | owner | admin | dentist | hygienist | assistant | front | billing | auditor |
|---|---|---|---|---|---|---|---|---|---|---|
| Manage clinics | ✓ | – | – | – | – | – | – | – | – | – |
| Manage staff | – | – | ✓ | ✓ | – | – | – | – | – | – |
| Clinic settings | – | – | ✓ | ✓ | – | – | – | – | – | – |
| View patients | R | R | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R |
| Edit clinical (notes/odontogram/plans) | – | – | ✓ | ✓ | ✓ | ✓ | limited | – | – | – |
| Sign notes | – | – | ✓ | ✓ | ✓ | ✓ | – | – | – | – |
| Schedule/reschedule | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | R |
| Invoices/payments | – | – | ✓ | ✓ | – | – | – | ✓ | ✓ | R |
| Claims | – | – | ✓ | ✓ | – | – | – | – | ✓ | R |
| Reports | – | R | ✓ | ✓ | own | own | – | – | ✓ | ✓ |
| Audit log | – | R | ✓ | ✓ | – | – | – | – | – | ✓ |
| Export data | – | – | ✓ | ✓ | – | – | – | – | – | – |

### 3.3 Seat model

- Owner + billing = 1 seat
- Each additional staff login = 1 seat
- Plans: Solo (1 dentist, 3 seats), Practice (3 dentists, 10 seats), Group (unlimited).
- Read-only auditor = free (1 per clinic).

---

## 4. Client / patient journey (UX ideology)

Two audiences: **staff** (product users) and **patients** (public-facing).

### 4.1 Patient journey
1. **Discovery** → public site or share link → `/book`
2. **Book** → pick service, provider (optional), slot (real availability), enter contact
3. **Intake** → dynamic form (medical history, allergies, insurance card upload, consent)
4. **Confirm** → email + SMS confirmation + calendar attachment
5. **Reminder** → 24h + 2h SMS/email
6. **Arrival** → self-check-in via QR (fills waiting room)
7. **Visit** → clinician charts, notes, plan
8. **Plan review** → patient portal shows treatment plan + estimate + accept/sign
9. **Payment** → invoice link, pay online, receipt emailed
10. **Recall** → automatic 6-month recall SMS + one-tap rebook

### 4.2 Staff journey (daily)
1. Sign in → **Today** dashboard (right-now + queues)
2. Front desk: check-in, collect copay, confirm insurance
3. Clinician: opens patient → alerts banner → odontogram → notes → plan
4. End of visit: charges auto-drafted from completed plan items → invoice → payment
5. End of day: reports → deposits reconciled → tomorrow prepped

Every action ≤ 3 clicks from the dashboard. Keyboard shortcuts for power users.

---

## 5. Build sequence (each slice = build + test cases, no skipping)

### Phase 1 — Tenancy foundation (BLOCKING for market)
**S1.1 Multi-tenant schema**
- Add `clinics` table, `clinic_id` on every table, RLS scoped to `current_clinic_id()`
- `clinic_members` join table (replaces flat user_roles for multi-clinic)
- Migration to move existing data into a "Default Clinic"

Test cases:
- User A in Clinic 1 cannot read Clinic 2 patients (RLS)
- User in 2 clinics can switch context; queries only return active clinic
- Deleting clinic cascades cleanly

**S1.2 Clinic switcher + onboarding wizard**
- Top-bar clinic switcher
- Wizard: clinic name → chairs → providers → hours → services → done
- Test: fresh signup creates clinic + owner in <10 min, all screens usable

**S1.3 Super admin portal** (`/platform/*`, separate layout)
- List clinics, create, suspend, impersonate (with audit)
- Usage per clinic (patients, appts, storage)
- Test: super_admin sees all; clinic user gets 403

### Phase 2 — Expanded roles + permissions
**S2.1 Add 5 new roles** (owner, assistant, billing, auditor, support)
**S2.2 Permission enforcement** — server-side `can(action, resource)` helper + UI hide/disable
**S2.3 Automated role tests** — Playwright: login as each role, assert allowed/denied on every route + mutation

### Phase 3 — File storage
**S3.1 Storage bucket per clinic** (x-rays, photos, consents, insurance cards)
**S3.2 Upload UI** on patient chart, intake, insurance
**S3.3 Signed URLs, expiry, virus scan hook**
Tests: upload/download/delete per role, cross-clinic blocked

### Phase 4 — Communications (needs domain + Twilio)
**S4.1 Email domain setup + templates**
**S4.2 Twilio connector + SMS templates**
**S4.3 Reminder scheduler (pg_cron → server route)**
**S4.4 2-way SMS inbox on patient chart**
**S4.5 Recall campaigns**
Tests: reminder fires at T-24h, opt-out honored, replies logged.

### Phase 5 — Patient portal
**S5.1 Public login for patients** (magic link)
**S5.2 View upcoming appts, sign consent, see plan + estimate, pay invoice**
**S5.3 Upload insurance card, update contact**
Tests: patient can only see own record.

### Phase 6 — Billing v2
**S6.1 Auto-draft charges from completed plan items**
**S6.2 Stripe payments (optional per clinic)**
**S6.3 Insurance claim status webhook stub**
**S6.4 Statements batch email**

### Phase 7 — Reporting & audit
**S7.1 Reports v2** — production by provider, collections, aging, recall effectiveness, no-show rate, chair utilization (existing), new patient sources
**S7.2 Audit log viewer** with filter (user, action, date, resource)
**S7.3 Data export (CSV + JSON) per clinic owner**

### Phase 8 — Inventory + Rx
**S8.1 Inventory items, stock, reorder, low-stock alerts**
**S8.2 Prescription writer (print + e-Rx stub)**

### Phase 9 — Polish & launch
- Mobile pass on every screen
- Empty states + error boundaries reviewed
- Legal pages (ToS, Privacy, BAA)
- Marketing site + pricing
- Automated E2E suite green in CI
- Backup + restore drill

---

## 6. QA strategy (per slice, non-negotiable)

For every slice:
1. **Unit** — API functions (Vitest)
2. **RLS** — SQL tests: each role × each table × read/write
3. **E2E** — Playwright: happy path + one failure per role
4. **Manual smoke** — checklist in PR description
5. Slice is not "done" until all four are green.

---

## 7. Decisions I need from you before starting Phase 1

1. **Product name locked?** (Curelo vs Enamel — currently mixed)
2. **Multi-clinic scope**: single-location clinics only, or support multi-location groups (chair sharing across sites)?
3. **Super admin**: you as sole super_admin, or a team?
4. **Pricing tiers**: use the Solo/Practice/Group above, or your own?
5. **Patient portal**: in scope for v1 launch, or v1.1?
6. **Comms**: pick email domain now so Phase 4 isn't blocked later.

Answer these and I start Phase 1 (S1.1 multi-tenant schema) immediately. From there I execute slice by slice with test cases attached to each, and I do **not** move to the next slice until the current one passes its tests.
