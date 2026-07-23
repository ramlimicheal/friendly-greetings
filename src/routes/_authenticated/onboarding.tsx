import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/use-clinic";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your clinic — Enamel" }, { name: "robots", content: "noindex" }] }),
  component: OnboardingPage,
});

type Step = 1 | 2 | 3 | 4;

function OnboardingPage() {
  const navigate = useNavigate();
  const { activeClinicId, loading, reload } = useClinic();
  const [step, setStep] = useState<Step>(1);
  const [orgName, setOrgName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [chairs, setChairs] = useState(4);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If user already has an active clinic, kick them out of the wizard.
  useEffect(() => {
    if (!loading && activeClinicId) navigate({ to: "/dashboard" });
  }, [loading, activeClinicId, navigate]);

  const create = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      // 1. Organization
      const { data: org, error: eOrg } = await supabase
        .from("organizations")
        .insert({ name: orgName || clinicName, created_by: u.user.id })
        .select("id")
        .single();
      if (eOrg) throw eOrg;
      // 2. Clinic
      const { data: clinic, error: eClinic } = await supabase
        .from("clinics")
        .insert({
          organization_id: org.id,
          name: clinicName,
          city: city || null,
          country: country || null,
          phone: phone || null,
          chair_count: chairs,
          timezone,
        })
        .select("id")
        .single();
      if (eClinic) throw eClinic;
      // 3. Owner membership
      const { error: eMem } = await supabase
        .from("clinic_members")
        .insert({ clinic_id: clinic.id, user_id: u.user.id, role: "owner" });
      if (eMem) throw eMem;
      // 4. Activate this clinic on profile
      await supabase.rpc("switch_active_clinic", { _clinic_id: clinic.id });
      await reload();
      navigate({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Set up your clinic</h1>
            <p className="text-sm text-muted-foreground">Takes about a minute. You can change everything later.</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-1 " +
                  (s < step
                    ? "bg-primary text-primary-foreground ring-primary"
                    : s === step
                    ? "bg-primary-soft text-accent-foreground ring-primary/40"
                    : "bg-muted text-muted-foreground ring-border")
                }
              >
                {s < step ? <Check className="h-3.5 w-3.5" /> : s}
              </span>
              {s < 4 && <span className={"h-px w-8 " + (s < step ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-card p-7 ring-1 ring-border">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Organization</h2>
              <p className="text-xs text-muted-foreground">
                Your parent organization. Use the same name as your clinic if you only have one location.
              </p>
              <Field label="Organization name" value={orgName} onChange={setOrgName} placeholder="Northside Dental Group" />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">First clinic</h2>
              <Field label="Clinic name" value={clinicName} onChange={setClinicName} placeholder="Northside Dental — Downtown" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" value={city} onChange={setCity} placeholder="Stockholm" />
                <Field label="Country" value={country} onChange={setCountry} placeholder="Sweden" />
              </div>
              <Field label="Phone" value={phone} onChange={setPhone} placeholder="+46…" />
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Operating setup</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Number of chairs</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={chairs}
                    onChange={(e) => setChairs(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <Field label="Time zone" value={timezone} onChange={setTimezone} placeholder="Europe/Stockholm" />
              </div>
              <p className="text-xs text-muted-foreground">
                You can invite staff, define services, and set business hours from Settings after finishing.
              </p>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Review</h2>
              <Review label="Organization" value={orgName || clinicName} />
              <Review label="Clinic" value={clinicName} />
              <Review label="Location" value={[city, country].filter(Boolean).join(", ") || "—"} />
              <Review label="Phone" value={phone || "—"} />
              <Review label="Chairs" value={String(chairs)} />
              <Review label="Time zone" value={timezone} />
              {err && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {err}
                </div>
              )}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1 || busy}
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-40"
            >
              Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                disabled={
                  (step === 1 && !orgName) ||
                  (step === 2 && !clinicName) ||
                  busy
                }
                onClick={() => setStep((s) => ((s + 1) as Step))}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={create}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create clinic"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
