# Build plan — Phases A through E

Goal: deliver the full PMS feature set from the competitor audit. I'll execute the slices below in order, one per turn, without stopping for approval between them. Each slice is scoped so it ships working end-to-end.

## Assumptions I'm locking in (tell me if any are wrong)
- **Single clinic** for now (no multi-tenant). Multi-location can be added later without breaking the schema.
- **Invite-only signup** — open signup gets disabled; only admin-invited emails can register.
- **Permission matrix** from the previous audit message stands as-is.
- **SMS** = Twilio (needs your account + credentials when we get to Phase D).
- **Payments** = Lovable's built-in Stripe (I'll trigger the enable flow at Phase C).
- **AI** = Lovable AI Gateway (Gemini for text, no extra key needed).
- **Insurance claims**: I'll build the internal claim/ledger data model and PDF export. Actual electronic submission to a clearinghouse (DentalXChange etc.) is out of scope — that requires a paid clearinghouse account and NPI credentialing, which is real-world business setup, not code.

## Slice-by-slice sequence

### Slice A1 — Multi-user foundation
- Staff Management page (admin only): list users, invite by email, change role, deactivate
- Invitation table + edge function that creates an auth user with the invited role pre-assigned
- Disable open signup; auth page checks for a valid invite before allowing account creation
- Route guards enforcing role-based access (hide/disable UI + RLS policies)
- Simple audit log table (user, action, entity, timestamp)

### Slice B1 — Clinical: odontogram
- Interactive SVG tooth chart (permanent + primary dentition, 32 + 20 teeth)
- Per-surface state: sound/caries/filling/crown/missing/implant/root canal
- Colored legend, click a surface to cycle states, right-click for procedure menu
- `tooth_chart` table storing per-tooth state per patient, versioned by date

### Slice B2 — Treatment plans & clinical notes
- Treatment plan builder: add procedures (with ADA/CDT code, fee, tooth, surface), group into phases, mark accepted/completed
- Fee schedule table (procedure code → default fee)
- Clinical notes with SOAP template, per-visit, signed & timestamped, editable until signed
- Medical alerts panel on patient header (allergies, conditions, meds) with red banner

### Slice C1 — Billing core
- Trigger Stripe enable
- Patient ledger: charges (from completed procedures), payments, adjustments, running balance
- Statement generation (PDF download, ready-to-email)
- A/R aging report (0-30 / 31-60 / 61-90 / 90+)
- Payment recording UI (cash / check / card via Stripe / insurance write-off)

### Slice C2 — Insurance
- Insurance plan + patient coverage tables (carrier, group, member ID, deductible, annual max, coverage % per category)
- Claim data model: create claim from completed procedures, track submitted → paid → adjusted
- Printable ADA claim form (PDF) as the export path (no clearinghouse integration)
- Estimator on treatment plans: patient portion vs insurance portion

### Slice D1 — Patient-facing booking & intake
- Public booking page (`/book`, no auth): choose provider, service, time slot; creates unconfirmed appointment + patient shell
- Digital intake form: patient fills demographics, medical history, insurance, consents; signable on device
- Public patient lookup by phone + DOB to check appointments (no login for patients — keeps it simple)

### Slice D2 — Communications
- SMS reminders (Twilio): confirm, day-before, day-of; two-way replies stored per patient
- Email reminders (Resend or built-in Cloud email) as fallback if no phone
- Automated recall campaigns: send when recall is due
- Templates admin can edit

### Slice E1 — AI differentiators
- AI clinical note dictation: mic button → Gemini transcribes → generates SOAP note draft
- AI benefit breakdown: paste insurance PDF/text → Gemini extracts coverage % per category, populates coverage record
- Predictive no-show score on each appointment: simple model from history (past no-shows, lead time, day of week, provider)
- AI treatment plan explainer for patients: plain-language summary of a plan they can read

## What each slice ships
Migration + backend + UI + role gating + navigation. Every slice is usable on its own; nothing left half-built between turns.

## What I need from you
1. **Confirm the assumptions above** (single-clinic, invite-only, permission matrix, defer clearinghouse).
2. **Say "go"** and I'll start with Slice A1 and continue through the list, one slice per turn. I'll pause only if I hit something that genuinely needs your decision (e.g. Twilio credentials in Slice D2, Stripe enable form in Slice C1).

## Notes on realism
- This is ~8 substantial turns of build work. It won't all land in one message.
- Some UI (odontogram, treatment plan builder) will be functional but visually rough on first pass — we can polish after each slice if you want.
- I won't add fake data or mock-only pages. If a feature can't be fully wired, I'll flag it explicitly.
