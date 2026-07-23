import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CalendarClock, ClipboardList, Loader2 } from "lucide-react";
import {
  listPublicClinicServices,
  submitPublicBookingRequest,
  type BookingRequestRow,
} from "@/lib/booking-api";

const PUBLIC_CLINIC_SLUG = (import.meta.env.VITE_PUBLIC_BOOKING_SLUG as string | undefined) ?? "";

type PublicService = { id: string; name: string; description: string | null; duration_min: number };

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book an appointment — Enamel Dental Clinic" },
      { name: "description", content: "Request an appointment online. We'll confirm your slot by phone or email." },
      { property: "og:title", content: "Book an appointment — Enamel Dental Clinic" },
      { property: "og:description", content: "Request an appointment online. We'll confirm your slot by phone or email." },
    ],
  }),
  component: BookPage,
});

type Step = "booking" | "intake" | "done";

function BookPage() {
  const [services, setServices] = useState<PublicService[]>([]);
  const [step, setStep] = useState<Step>("booking");
  const [booking, setBooking] = useState<BookingRequestRow | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!PUBLIC_CLINIC_SLUG) {
      setLoadErr("Online booking is not yet enabled for this site. Please call the clinic to schedule.");
      return;
    }
    listPublicClinicServices(PUBLIC_CLINIC_SLUG)
      .then((rows) => setServices(rows))
      .catch((e) => setLoadErr(e instanceof Error ? e.message : "Unable to load services."));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold">E</span>
            <span className="text-sm font-semibold">Enamel Dental Clinic</span>
          </Link>
          <div className="hidden text-xs text-muted-foreground sm:block">Northside Practice · (555) 123-4567</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Stepper step={step} />

        {loadErr && (
          <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{loadErr}</div>
        )}

        {step === "booking" && !loadErr && (
          <BookingForm
            services={services}
            onSubmit={async (data) => {
              const preferredAt = new Date(`${data.preferred_date}T${data.preferred_time}`).toISOString();
              const id = await submitPublicBookingRequest({
                clinic_slug: PUBLIC_CLINIC_SLUG,
                patient_name: data.full_name,
                email: data.email ?? "",
                phone: data.phone,
                preferred_at: preferredAt,
                reason: data.reason,
              });
              // Local echo for the confirmation screen (row is not returned by the RPC).
              setBooking({
                id,
                full_name: data.full_name,
                phone: data.phone,
                email: data.email,
                date_of_birth: data.date_of_birth,
                service_id: data.service_id,
                preferred_provider: data.preferred_provider,
                preferred_date: data.preferred_date,
                preferred_time: data.preferred_time,
                reason: data.reason,
                is_new_patient: data.is_new_patient,
                status: "pending",
              } as unknown as BookingRequestRow);
              setStep("done");
            }}
          />
        )}

        {step === "done" && booking && <Confirmation booking={booking} />}
      </main>
    </div>
  );
}


function Stepper({ step }: { step: Step }) {
  const items = [
    { key: "booking", label: "Choose time", icon: CalendarClock },
    { key: "intake", label: "Intake form", icon: ClipboardList },
    { key: "done", label: "Confirmed", icon: Check },
  ] as const;
  const idx = items.findIndex((i) => i.key === step);
  return (
    <ol className="mb-8 flex items-center gap-2">
      {items.map((it, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <li key={it.key} className="flex flex-1 items-center gap-2">
            <span
              className={
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold " +
                (done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
              }
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={"hidden text-xs font-medium sm:inline " + (active || done ? "text-foreground" : "text-muted-foreground")}>{it.label}</span>
            {i < items.length - 1 && <span className={"ml-1 h-px flex-1 " + (done ? "bg-primary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-border sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-foreground">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/40";

function BookingForm({
  services,
  onSubmit,
}: {
  services: PublicService[];
  onSubmit: (data: {
    full_name: string;
    phone: string;
    email: string | null;
    date_of_birth: string | null;
    service_id: string | null;
    preferred_provider: string | null;
    preferred_date: string;
    preferred_time: string;
    reason: string | null;
    is_new_patient: boolean;
  }) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    service_id: services[0]?.id ?? "",
    preferred_provider: "",
    preferred_date: "",
    preferred_time: "09:00",
    reason: "",
    is_new_patient: true,
  });

  useEffect(() => {
    if (!form.service_id && services[0]) setForm((f) => ({ ...f, service_id: services[0].id }));
  }, [services, form.service_id]);

  const selectedService = services.find((s) => s.id === form.service_id) ?? null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form.full_name.trim() || !form.phone.trim() || !form.preferred_date || !form.preferred_time) {
      setErr("Please fill in name, phone, preferred date and time.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        date_of_birth: form.date_of_birth || null,
        service_id: form.service_id || null,
        preferred_provider: form.preferred_provider || null,
        preferred_date: form.preferred_date,
        preferred_time: form.preferred_time,
        reason: form.reason.trim() || null,
        is_new_patient: form.is_new_patient,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Card title="Book an appointment" subtitle="Tell us what you need — we'll confirm your time by phone or email within one business day.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <input className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="Phone" required>
            <input className={inputCls} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Date of birth">
            <input className={inputCls} type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </Field>
        </div>

        <Field label="Service" required>
          <select className={inputCls} value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.duration_min} min
              </option>
            ))}
          </select>
          {selectedService?.description && (
            <p className="mt-1 text-xs text-muted-foreground">{selectedService.description}</p>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Preferred date" required>
            <input
              className={inputCls}
              type="date"
              value={form.preferred_date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
            />
          </Field>
          <Field label="Preferred time" required>
            <input className={inputCls} type="time" value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} />
          </Field>
          <Field label="Provider (optional)">
            <select className={inputCls} value={form.preferred_provider} onChange={(e) => setForm({ ...form, preferred_provider: e.target.value })}>
              <option value="">Any available</option>
              <option value="Dr. Patel">Dr. Patel</option>
              <option value="Dr. Kim">Dr. Kim</option>
            </select>
          </Field>
        </div>

        <Field label="What brings you in?">
          <textarea
            className={inputCls}
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Chief complaint or reason for visit (optional)"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_new_patient}
            onChange={(e) => setForm({ ...form, is_new_patient: e.target.checked })}
          />
          I'm a new patient
        </label>

        {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </button>
      </Card>
    </form>
  );
}

function IntakeForm({
  booking,
  onSubmit,
  onSkip,
}: {
  booking: BookingRequestRow;
  onSubmit: (form: {
    full_name: string;
    date_of_birth: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    allergies: string[];
    medical_conditions: string[];
    medications: string[];
    insurance_carrier: string | null;
    insurance_member_id: string | null;
    insurance_group: string | null;
    consent_treatment: boolean;
    consent_privacy: boolean;
    signature: string | null;
  }) => Promise<void>;
  onSkip: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: booking.full_name,
    date_of_birth: booking.date_of_birth ?? "",
    phone: booking.phone,
    email: booking.email ?? "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    allergies: "",
    medical_conditions: "",
    medications: "",
    insurance_carrier: "",
    insurance_member_id: "",
    insurance_group: "",
    consent_treatment: false,
    consent_privacy: false,
    signature: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form.consent_treatment || !form.consent_privacy) {
      setErr("Please review and accept both consents to submit.");
      return;
    }
    if (!form.signature.trim()) {
      setErr("Please type your full name as your signature.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        full_name: form.full_name,
        date_of_birth: form.date_of_birth || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        allergies: parseList(form.allergies),
        medical_conditions: parseList(form.medical_conditions),
        medications: parseList(form.medications),
        insurance_carrier: form.insurance_carrier || null,
        insurance_member_id: form.insurance_member_id || null,
        insurance_group: form.insurance_group || null,
        consent_treatment: form.consent_treatment,
        consent_privacy: form.consent_privacy,
        signature: form.signature.trim(),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not submit intake.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Card title="Patient intake" subtitle="Complete now to save time at your visit. You can skip and fill this out at the office.">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <input className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="Date of birth">
              <input className={inputCls} type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Address">
              <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Emergency contact">
              <input className={inputCls} placeholder="Name" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
            </Field>
            <Field label="Emergency phone">
              <input className={inputCls} value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Medical history</h2>
          <div className="mt-3 space-y-4">
            <Field label="Allergies (comma-separated)">
              <input className={inputCls} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Latex" />
            </Field>
            <Field label="Medical conditions (comma-separated)">
              <input className={inputCls} value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} placeholder="e.g. Hypertension, Diabetes" />
            </Field>
            <Field label="Current medications (comma-separated)">
              <input className={inputCls} value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Insurance (optional)</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Carrier">
              <input className={inputCls} value={form.insurance_carrier} onChange={(e) => setForm({ ...form, insurance_carrier: e.target.value })} />
            </Field>
            <Field label="Member ID">
              <input className={inputCls} value={form.insurance_member_id} onChange={(e) => setForm({ ...form, insurance_member_id: e.target.value })} />
            </Field>
            <Field label="Group">
              <input className={inputCls} value={form.insurance_group} onChange={(e) => setForm({ ...form, insurance_group: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl bg-muted/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Consents</h2>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={form.consent_treatment} onChange={(e) => setForm({ ...form, consent_treatment: e.target.checked })} />
            <span>I consent to dental examination and treatment as recommended by my provider.</span>
          </label>
          <label className="mt-2 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={form.consent_privacy} onChange={(e) => setForm({ ...form, consent_privacy: e.target.checked })} />
            <span>I acknowledge the clinic's HIPAA privacy notice and use of my health information for care and billing.</span>
          </label>
          <Field label="Signature (type full name)" required>
            <input className={inputCls + " font-serif italic"} value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} />
          </Field>
        </section>

        {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit intake
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      </Card>
    </form>
  );
}

function Confirmation({ booking }: { booking: BookingRequestRow }) {
  return (
    <Card title="Request received" subtitle="We'll call or email you shortly to confirm your appointment.">
      <div className="rounded-2xl bg-primary-soft p-4 text-sm text-accent-foreground">
        <div className="font-semibold">Requested time</div>
        <div className="mt-1">
          {new Date(booking.preferred_date + "T" + booking.preferred_time).toLocaleString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
        {booking.preferred_provider && <div className="mt-1 text-xs text-muted-foreground">Provider: {booking.preferred_provider}</div>}
      </div>
      <p className="text-sm text-muted-foreground">
        Reference: <span className="font-mono text-foreground">{booking.id.slice(0, 8)}</span>
      </p>
      <Link to="/" className="inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
        Return to home
      </Link>
    </Card>
  );
}

function parseList(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
