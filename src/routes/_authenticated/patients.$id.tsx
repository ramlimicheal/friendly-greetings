import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Shield,
  Calendar,
  FileText,
  DollarSign,
  AlertTriangle,
  Plus,
  MessageSquare,
} from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, Pill, SectionHeader } from "@/components/app-shell";
import { patients, toothChart, invoices, type ToothCondition } from "@/lib/mock-data";

export const Route = createFileRoute("/patients/$id")({
  loader: ({ params }) => {
    const patient = patients.find((p) => p.id === params.id);
    if (!patient) throw notFound();
    return { patient };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.patient.name} — Patient Chart` },
          { name: "description", content: `Full clinical chart for ${loaderData.patient.name}: odontogram, treatment plan, history, and billing.` },
        ]
      : [{ title: "Patient — Enamel" }],
  }),
  component: PatientDetail,
  notFoundComponent: () => (
    <AppShell title="Patient not found">
      <Card>
        <p className="text-sm text-muted-foreground">We couldn't find that patient.</p>
        <div className="mt-4">
          <Link to="/patients" className="text-sm font-medium text-primary hover:underline">← Back to patients</Link>
        </div>
      </Card>
    </AppShell>
  ),
});

type Tab = "overview" | "chart" | "plan" | "history" | "billing";

function PatientDetail() {
  const { patient } = Route.useLoaderData();
  const [tab, setTab] = useState<Tab>("overview");
  const pInvoices = invoices.filter((i) => i.patientId === patient.id);

  return (
    <AppShell
      title={patient.name}
      subtitle={`${patient.chartNo} · ${patient.age} y/o · ${patient.sex} · Primary: ${patient.primaryDentist}`}
      actions={
        <>
          <Link to="/patients" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All patients
          </Link>
          <GhostButton icon={MessageSquare}>Message</GhostButton>
          <PrimaryButton icon={Plus}>Book appointment</PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        {/* left rail */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-lg font-semibold text-accent-foreground">
                {patient.initials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{patient.name}</div>
                <div className="text-xs text-muted-foreground">{patient.chartNo}</div>
                <div className="mt-1"><Pill tone={patient.status === "Overdue" ? "danger" : patient.status === "Recall" ? "warn" : "success"}>{patient.status}</Pill></div>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              <Info icon={Phone} label={patient.phone} />
              <Info icon={Mail} label={patient.email} />
              <Info icon={MapPin} label={patient.address} />
              <Info icon={Shield} label={patient.insurance} />
              <Info icon={Calendar} label={`Next: ${patient.nextVisit ?? "not scheduled"}`} />
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Alerts" icon={AlertTriangle} />
            {patient.allergies.length > 0 ? (
              <ul className="space-y-2">
                {patient.allergies.map((a: string) => (
                  <li key={a} className="flex items-center justify-between rounded-2xl bg-red-50 px-3 py-2 text-sm ring-1 ring-red-100">
                    <span className="font-medium text-red-700">Allergy · {a}</span>
                    <Pill tone="danger">Avoid</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No known allergies on file.</p>
            )}
            <div className="mt-3 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
              {patient.notes}
            </div>
          </Card>

          <Card>
            <SectionHeader title="Balance" icon={DollarSign} />
            <div className="text-3xl font-semibold">${patient.balance}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {patient.balance > 0 ? "Outstanding — send statement?" : "Account in good standing."}
            </p>
          </Card>
        </div>

        {/* right main */}
        <div>
          <Card className="!p-0 overflow-hidden">
            <div className="flex gap-1 border-b border-border bg-muted/40 p-2">
              {(["overview","chart","plan","history","billing"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    "rounded-full px-4 py-1.5 text-sm font-medium transition capitalize " +
                    (tab === t ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "chart" ? "Odontogram" : t}
                </button>
              ))}
            </div>
            <div className="p-6">
              {tab === "overview" && <OverviewTab />}
              {tab === "chart" && <OdontogramTab />}
              {tab === "plan" && <TreatmentPlanTab />}
              {tab === "history" && <HistoryTab />}
              {tab === "billing" && <BillingTab invoices={pInvoices} />}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <span className="min-w-0 break-words">{label}</span>
    </li>
  );
}

/* ---------- tabs ---------- */

function OverviewTab() {
  const items = [
    { t: "Last cleaning", v: "Oct 02, 2025 · Nadia Rossi" },
    { t: "Last X-ray", v: "Aug 15, 2025 · Bitewings" },
    { t: "Perio charting", v: "Jul 22, 2025 · WNL" },
    { t: "Recall interval", v: "6 months" },
    { t: "Referring dentist", v: "Self-referred" },
    { t: "Preferred contact", v: "SMS · evenings" },
  ];
  return (
    <div>
      <SectionHeader title="Clinical overview" icon={FileText} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.t} className="rounded-2xl bg-muted/60 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{it.t}</div>
            <div className="mt-1 text-sm font-medium">{it.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- ODONTOGRAM ---------- */

const CONDITION_COLORS: Record<ToothCondition, { fill: string; label: string; dot: string }> = {
  healthy: { fill: "fill-card stroke-border", label: "Healthy", dot: "bg-card ring-1 ring-border" },
  caries: { fill: "fill-red-100 stroke-red-500", label: "Caries", dot: "bg-red-500" },
  filled: { fill: "fill-primary-soft stroke-primary", label: "Filled", dot: "bg-primary" },
  crown: { fill: "fill-amber-100 stroke-amber-500", label: "Crown", dot: "bg-amber-500" },
  implant: { fill: "fill-cyan-100 stroke-cyan-600", label: "Implant", dot: "bg-cyan-600" },
  "root-canal": { fill: "fill-purple-100 stroke-purple-500", label: "Root canal", dot: "bg-purple-500" },
  missing: { fill: "fill-muted stroke-border", label: "Missing", dot: "bg-muted-foreground/50" },
};

function OdontogramTab() {
  const [selected, setSelected] = useState<number | null>(14);
  const upper = Array.from({ length: 16 }, (_, i) => i + 1); // 1–16
  const lower = Array.from({ length: 16 }, (_, i) => 32 - i); // 32–17
  return (
    <div>
      <SectionHeader
        title="Odontogram"
        icon={FileText}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(CONDITION_COLORS) as ToothCondition[]).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={"h-2.5 w-2.5 rounded-sm " + CONDITION_COLORS[c].dot} />
                {CONDITION_COLORS[c].label}
              </span>
            ))}
          </div>
        }
      />

      <div className="rounded-2xl bg-muted/40 p-4">
        <div className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">Upper — Right to Left</div>
        <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
          {upper.map((n) => (
            <Tooth key={n} num={n} condition={toothChart[n] ?? "healthy"} selected={selected === n} onSelect={setSelected} orient="upper" />
          ))}
        </div>

        <div className="my-4 h-px bg-border" />

        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
          {lower.map((n) => (
            <Tooth key={n} num={n} condition={toothChart[n] ?? "healthy"} selected={selected === n} onSelect={setSelected} orient="lower" />
          ))}
        </div>
        <div className="mt-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">Lower — Right to Left</div>
      </div>

      {selected != null && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/60 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Tooth</div>
            <div className="text-2xl font-semibold">#{selected}</div>
            <div className="text-xs text-muted-foreground">Universal notation</div>
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Condition</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium">
              <span className={"h-2.5 w-2.5 rounded-sm " + CONDITION_COLORS[toothChart[selected] ?? "healthy"].dot} />
              {CONDITION_COLORS[toothChart[selected] ?? "healthy"].label}
            </div>
          </div>
          <div className="rounded-2xl bg-muted/60 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Last note</div>
            <div className="mt-1 text-sm">Charted Jul 22 · sensitivity to cold, monitor MOD.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tooth({
  num,
  condition,
  selected,
  onSelect,
  orient,
}: {
  num: number;
  condition: ToothCondition;
  selected: boolean;
  onSelect: (n: number) => void;
  orient: "upper" | "lower";
}) {
  const c = CONDITION_COLORS[condition];
  return (
    <button
      onClick={() => onSelect(num)}
      className={
        "group flex flex-col items-center rounded-md p-1 text-[10px] font-medium transition " +
        (selected ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-card")
      }
      title={`Tooth ${num} — ${c.label}`}
    >
      {orient === "upper" && <span className="text-muted-foreground">{num}</span>}
      <svg viewBox="0 0 24 32" className="h-8 w-6">
        {/* crown */}
        <path
          d="M4 6 C4 2, 20 2, 20 6 L20 18 C20 22, 4 22, 4 18 Z"
          className={c.fill}
          strokeWidth="1.5"
        />
        {/* root */}
        <path
          d="M8 22 L6 30 L10 30 L11 22 Z M13 22 L14 30 L18 30 L16 22 Z"
          className={c.fill}
          strokeWidth="1.5"
        />
      </svg>
      {orient === "lower" && <span className="text-muted-foreground">{num}</span>}
    </button>
  );
}

function TreatmentPlanTab() {
  const plan = [
    { phase: "Phase 1 — Disease control", items: [
      { code: "D1110", name: "Prophylaxis", tooth: "—", status: "Completed", fee: 120 },
      { code: "D4341", name: "Scaling & root planing UR", tooth: "UR", status: "Scheduled", fee: 285 },
    ]},
    { phase: "Phase 2 — Restorative", items: [
      { code: "D2391", name: "Composite MOD", tooth: "#14", status: "Proposed", fee: 220 },
      { code: "D2740", name: "Porcelain crown", tooth: "#30", status: "Proposed", fee: 1450 },
      { code: "D3310", name: "Root canal — anterior", tooth: "#8", status: "Proposed", fee: 950 },
    ]},
    { phase: "Phase 3 — Maintenance", items: [
      { code: "D1110", name: "Prophylaxis (6 mo)", tooth: "—", status: "Proposed", fee: 120 },
    ]},
  ];
  const total = plan.flatMap((p) => p.items).reduce((s, i) => s + i.fee, 0);
  return (
    <div>
      <SectionHeader
        title="Treatment plan"
        icon={FileText}
        action={<PrimaryButton icon={Plus}>Add item</PrimaryButton>}
      />
      <div className="space-y-5">
        {plan.map((phase) => (
          <div key={phase.phase}>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{phase.phase}</div>
            <div className="overflow-hidden rounded-2xl ring-1 ring-border">
              <div className="grid grid-cols-[80px_1fr_80px_120px_100px] gap-2 bg-muted/60 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <div>Code</div><div>Procedure</div><div>Tooth</div><div>Status</div><div className="text-right">Fee</div>
              </div>
              {phase.items.map((it) => (
                <div key={it.code + it.tooth} className="grid grid-cols-[80px_1fr_80px_120px_100px] items-center gap-2 border-t border-border px-4 py-3 text-sm">
                  <div className="text-muted-foreground">{it.code}</div>
                  <div className="font-medium">{it.name}</div>
                  <div>{it.tooth}</div>
                  <div>
                    <Pill tone={it.status === "Completed" ? "success" : it.status === "Scheduled" ? "info" : "muted"}>{it.status}</Pill>
                  </div>
                  <div className="text-right font-medium">${it.fee}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-2xl bg-primary-soft px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-accent-foreground">Total plan value</div>
            <div className="text-2xl font-semibold">${total.toLocaleString()}</div>
          </div>
          <div className="flex gap-2">
            <GhostButton>Print estimate</GhostButton>
            <PrimaryButton>Send for approval</PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryTab() {
  const events = [
    { d: "Oct 02, 2025", who: "Nadia Rossi", note: "Prophylaxis completed. BOP < 10%. Fluoride varnish applied." },
    { d: "Aug 15, 2025", who: "Dr. Rina Okafor", note: "Bitewing X-rays. Small incipient lesion #14 M — monitor." },
    { d: "Jul 22, 2025", who: "Dr. Rina Okafor", note: "Comprehensive exam. Charted existing composite #3." },
    { d: "Apr 10, 2025", who: "Nadia Rossi", note: "Prophylaxis. Reviewed home care." },
    { d: "Feb 03, 2025", who: "Dr. Rina Okafor", note: "Emergency visit — cold sensitivity #14. Advised composite." },
  ];
  return (
    <div>
      <SectionHeader title="Clinical history" icon={FileText} />
      <ol className="space-y-4">
        {events.map((e, i) => (
          <li key={e.d} className="relative pl-6">
            <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary-soft" />
            {i < events.length - 1 && <span className="absolute left-[4px] top-4 h-full w-px bg-border" />}
            <div className="text-sm font-medium">{e.d} · {e.who}</div>
            <div className="text-sm text-muted-foreground">{e.note}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BillingTab({ invoices }: { invoices: { id: string; date: string; items: string; amount: number; status: string; method: string }[] }) {
  return (
    <div>
      <SectionHeader title="Billing" icon={DollarSign} />
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices for this patient yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-border">
          <div className="grid grid-cols-[110px_1fr_100px_120px_120px] gap-2 bg-muted/60 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <div>Invoice</div><div>Items</div><div>Date</div><div>Method</div><div className="text-right">Amount</div>
          </div>
          {invoices.map((i) => (
            <div key={i.id} className="grid grid-cols-[110px_1fr_100px_120px_120px] items-center gap-2 border-t border-border px-4 py-3 text-sm">
              <div className="font-medium">{i.id}</div>
              <div className="text-muted-foreground">{i.items}</div>
              <div>{i.date}</div>
              <div className="text-muted-foreground">{i.method}</div>
              <div className="flex items-center justify-end gap-2">
                <span className="font-semibold">${i.amount}</span>
                <Pill tone={i.status === "Paid" ? "success" : i.status === "Overdue" ? "danger" : i.status === "Partial" ? "warn" : "muted"}>{i.status}</Pill>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
