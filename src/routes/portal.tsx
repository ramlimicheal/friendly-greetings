import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, FileText, Receipt, User as UserIcon, LogOut, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getPortalLink,
  getPortalPatient,
  getPortalAppointments,
  getPortalPlans,
  getPortalInvoices,
} from "@/lib/portal-api";
import { formatDate } from "@/lib/patients-api";

export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Patient Portal — Enamel" },
      { name: "description", content: "View your appointments, treatment plans, and invoices." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

type Tab = "overview" | "appointments" | "plans" | "invoices";

function PortalPage() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<{ email: string; userId: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setSession({ email: data.user.email ?? "", userId: data.user.id });
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s?.user ? { email: s.user.email ?? "", userId: s.user.id } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <PortalAuth />;
  return <PortalDashboard />;
}

function PortalAuth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/portal`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) setInfo("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link to="/portal" className="mb-8 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" strokeWidth={3} />
          </span>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight">Enamel</div>
            <div className="text-[11px] text-muted-foreground">Patient portal</div>
          </div>
        </Link>

        <div className="rounded-3xl bg-card p-7 ring-1 ring-border">
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Access your appointments, treatment plans and invoices."
              : "Use the same email your clinic has on file so we can link your records."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Full name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            {err && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {err}
              </div>
            )}
            {info && (
              <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                New patient?{" "}
                <button type="button" onClick={() => setMode("signup")} className="font-medium text-foreground underline-offset-2 hover:underline">
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("signin")} className="font-medium text-foreground underline-offset-2 hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-4 text-center text-[11px] text-muted-foreground">
            Clinic staff?{" "}
            <Link to="/auth" className="font-medium text-foreground underline-offset-2 hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);
  const [patient, setPatient] = useState<Awaited<ReturnType<typeof getPortalPatient>> | null>(null);
  const [appts, setAppts] = useState<Awaited<ReturnType<typeof getPortalAppointments>>>([]);
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof getPortalPlans>>>([]);
  const [invoices, setInvoices] = useState<Awaited<ReturnType<typeof getPortalInvoices>>>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const link = await getPortalLink();
      if (!alive) return;
      if (!link) {
        setLinked(false);
        setLoading(false);
        return;
      }
      setLinked(true);
      const [p, a, pl, iv] = await Promise.all([
        getPortalPatient(link.patient_id),
        getPortalAppointments(link.patient_id),
        getPortalPlans(link.patient_id),
        getPortalInvoices(link.patient_id),
      ]);
      if (!alive) return;
      setPatient(p);
      setAppts(a);
      setPlans(pl);
      setInvoices(iv);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!linked) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-6 py-16">
          <div className="rounded-3xl bg-card p-7 ring-1 ring-border">
            <h1 className="text-lg font-semibold">We couldn't find your patient record</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account isn't linked to a patient chart yet. Please contact your clinic and ask them
              to add your account email to your file. Once they do, sign in again and your records will
              appear here automatically.
            </p>
            <button
              onClick={signOut}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const upcoming = appts.filter((a) => new Date(a.start_at) >= new Date());
  const past = appts.filter((a) => new Date(a.start_at) < new Date());
  const outstanding = invoices.filter((i) => Number(i.balance ?? 0) > 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/portal" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" strokeWidth={3} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Enamel</div>
              <div className="text-[11px] text-muted-foreground">Patient portal</div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden text-right sm:block">
              <div className="font-medium">{patient?.full_name}</div>
              <div className="text-xs text-muted-foreground">{patient?.chart_no}</div>
            </div>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {(
            [
              { id: "overview", label: "Overview", icon: UserIcon },
              { id: "appointments", label: "Appointments", icon: Calendar },
              { id: "plans", label: "Treatment plans", icon: FileText },
              { id: "invoices", label: "Invoices", icon: Receipt },
            ] as { id: Tab; label: string; icon: typeof UserIcon }[]
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "overview" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Next appointment">
              {upcoming.length ? (
                <div>
                  <div className="text-lg font-semibold">
                    {new Date(upcoming[upcoming.length - 1].start_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {upcoming[upcoming.length - 1].provider ?? "Provider TBD"} · Chair {upcoming[upcoming.length - 1].chair ?? "—"}
                  </div>
                </div>
              ) : (
                <Empty>No upcoming appointments. Contact your clinic to schedule.</Empty>
              )}
            </Card>
            <Card title="Balance due">
              <div className="text-2xl font-semibold">
                ${outstanding.reduce((s, i) => s + Number(i.balance ?? 0), 0).toFixed(2)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {outstanding.length} open invoice{outstanding.length === 1 ? "" : "s"}
              </div>
            </Card>
            <Card title="Active plans">
              <div className="text-2xl font-semibold">{plans.filter((p) => p.status !== "completed").length}</div>
              <div className="mt-1 text-sm text-muted-foreground">Treatment plans in progress</div>
            </Card>
            <Card title="Your info">
              <div className="text-sm">
                <div className="font-medium">{patient?.full_name}</div>
                <div className="text-muted-foreground">{patient?.email ?? "—"}</div>
                <div className="text-muted-foreground">{patient?.phone ?? "—"}</div>
              </div>
            </Card>
          </div>
        )}

        {tab === "appointments" && (
          <div className="space-y-6">
            <Section title={`Upcoming (${upcoming.length})`}>
              {upcoming.length === 0 && <Empty>No upcoming appointments.</Empty>}
              {upcoming.map((a) => (
                <Row
                  key={a.id}
                  primary={new Date(a.start_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  secondary={`${a.provider ?? "Provider TBD"} · ${a.duration_min} min · Chair ${a.chair ?? "—"}`}
                  badge={a.status}
                />
              ))}
            </Section>
            <Section title={`Past (${past.length})`}>
              {past.length === 0 && <Empty>No past visits recorded.</Empty>}
              {past.map((a) => (
                <Row
                  key={a.id}
                  primary={new Date(a.start_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  secondary={`${a.provider ?? "Provider"} · ${a.duration_min} min`}
                  badge={a.status}
                />
              ))}
            </Section>
          </div>
        )}

        {tab === "plans" && (
          <div className="space-y-4">
            {plans.length === 0 && <Empty>No treatment plans yet.</Empty>}
            {plans.map((p) => (
              <div key={p.id} className="rounded-2xl bg-card p-5 ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{p.title}</div>
                    <div className="text-xs text-muted-foreground">Created {formatDate(p.created_at)}</div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize">
                    {p.status}
                  </span>
                </div>
                <div className="mt-4 text-sm">
                  <div className="text-xs text-muted-foreground">Total fee</div>
                  <div className="font-semibold">${p.total_fee.toFixed(2)}</div>
                </div>
                {p.items.length ? (
                  <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                    {p.items.map((it) => (
                      <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <div>{it.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {it.tooth_number ? `Tooth ${it.tooth_number} · ` : ""}
                            <span className="capitalize">{it.status}</span>
                          </div>
                        </div>
                        <div className="text-sm font-medium">${Number(it.fee ?? 0).toFixed(2)}</div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {tab === "invoices" && (
          <div className="space-y-2">
            {invoices.length === 0 && <Empty>No invoices yet.</Empty>}
            {invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-border">
                <div>
                  <div className="text-sm font-semibold">{i.invoice_no}</div>
                  <div className="text-xs text-muted-foreground">
                    Issued {formatDate(i.issued_at)} · Due {formatDate(i.due_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">${Number(i.total).toFixed(2)}</div>
                  <div
                    className={`text-xs ${
                      Number(i.balance ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {Number(i.balance ?? 0) > 0 ? `Balance $${Number(i.balance).toFixed(2)}` : "Paid"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ primary, secondary, badge }: { primary: string; secondary: string; badge?: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-border">
      <div>
        <div className="text-sm font-semibold">{primary}</div>
        <div className="text-xs text-muted-foreground">{secondary}</div>
      </div>
      {badge && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize">{badge}</span>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">{children}</div>;
}
