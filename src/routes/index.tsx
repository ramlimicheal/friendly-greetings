import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus,
  Share2,
  Activity,
  Users,
  CalendarCheck,
  DollarSign,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Circle,
} from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, SectionHeader, Pill } from "@/components/app-shell";
import {
  todaysAppointments,
  revenueLast30,
  chairUtilization,
  procedureMix,
  patients,
  invoices,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Enamel Dental Clinic" },
      { name: "description", content: "Clinic-wide overview: today's schedule, revenue, chair utilization, and patient flow." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const revenueToday = 8420;
  const patientsToday = todaysAppointments.length;
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);

  return (
    <AppShell
      title="Clinic Overview"
      subtitle="Tuesday, October 14 · 4 chairs · 2 dentists on the floor"
      actions={
        <>
          <GhostButton icon={Share2}>Export report</GhostButton>
          <PrimaryButton icon={Plus}>New appointment</PrimaryButton>
        </>
      }
    >
      {/* KPI ROW */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          title="Patients today"
          value={String(patientsToday)}
          unit="visits"
          delta="+12%"
          up
          spark={<Bars data={[3, 5, 4, 6, 7, 5, 8, 6, 9, 7, 8, 10, 9, 12]} />}
          caption={<>3 arrived · 1 in chair · 2 no-show risk</>}
          icon={Users}
        />
        <Kpi
          title="Revenue today"
          value={`$${revenueToday.toLocaleString()}`}
          unit="USD"
          delta="+18%"
          up
          spark={<LineSpark data={revenueLast30.slice(-14)} />}
          caption={<>Averaging <strong className="text-foreground">$6.4k</strong>/day this month</>}
          icon={DollarSign}
        />
        <Kpi
          title="Chair utilization"
          value="78"
          unit="%"
          delta="+4%"
          up
          spark={<Bars data={chairUtilization.map((c) => c.pct)} full />}
          caption={<>Chair 3 leads at <strong className="text-foreground">91%</strong> booked</>}
          icon={Activity}
        />
        <Kpi
          title="Outstanding A/R"
          value={`$${outstanding.toLocaleString()}`}
          unit="due"
          delta="-6%"
          up={false}
          spark={<Bars data={[9, 8, 10, 7, 8, 6, 7, 5, 6, 4]} muted />}
          caption={<><strong className="text-foreground">2 invoices</strong> overdue · 1 pending insurance</>}
          icon={CalendarCheck}
        />
      </section>

      {/* MID ROW */}
      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <RevenueChart />
        <TodaySnapshot />
      </section>

      {/* SCHEDULE STRIP + PROCEDURE MIX */}
      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <TodayScheduleStrip />
        <ProcedureMix />
      </section>

      {/* BOTTOM ROW */}
      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RecentPatients />
        <BillingSnapshot />
        <ChairUtilizationCard />
      </section>
    </AppShell>
  );
}

/* ---------- widgets ---------- */

function Kpi({
  title,
  value,
  unit,
  delta,
  up,
  spark,
  caption,
  icon: Icon,
}: {
  title: string;
  value: string;
  unit: string;
  delta: string;
  up: boolean;
  spark: React.ReactNode;
  caption: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
        <span
          className={
            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium " +
            (up ? "bg-primary-soft text-accent-foreground" : "bg-red-100 text-red-700")
          }
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-4 grid grid-cols-[100px_1fr] items-center gap-3">
        <div className="h-10 w-full text-primary">{spark}</div>
        <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </div>
    </Card>
  );
}

function LineSpark({ data }: { data: number[] }) {
  const w = 100, h = 40;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 6) - 3}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Bars({ data, full = false, muted = false }: { data: number[]; full?: boolean; muted?: boolean }) {
  const max = Math.max(...data) * (full ? 1 : 1);
  return (
    <div className="flex h-10 items-end gap-[3px]">
      {data.map((v, i) => (
        <span
          key={i}
          className={"w-1 rounded-sm " + (muted ? "bg-primary-muted" : "bg-primary")}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

function RevenueChart() {
  const data = revenueLast30;
  const max = Math.max(...data);
  const w = 700, h = 220;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 20) - 10] as const);
  const line = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <Card>
      <SectionHeader
        title="Revenue — last 30 days"
        icon={DollarSign}
        action={
          <div className="flex items-center gap-2">
            <Pill tone="info">$187,410 total</Pill>
            <button className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted">
              30d ▾
            </button>
          </div>
        }
      />
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.09 165)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(0.55 0.09 165)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="currentColor" className="text-border" strokeDasharray="3 4" />
          ))}
          <path d={area} fill="url(#rev)" />
          <path d={line} fill="none" stroke="oklch(0.55 0.09 165)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2" fill="oklch(0.55 0.09 165)" />
          ))}
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Sep 15</span><span>Sep 22</span><span>Sep 29</span><span>Oct 06</span><span>Oct 13</span>
      </div>
    </Card>
  );
}

function TodaySnapshot() {
  const stats = [
    { label: "Booked", value: 14, tone: "text-foreground" },
    { label: "Arrived", value: 3, tone: "text-primary" },
    { label: "In chair", value: 1, tone: "text-primary" },
    { label: "Cancelled", value: 1, tone: "text-red-600" },
  ];
  const providers = [
    { name: "Dr. Rina Okafor", booked: 8, next: "10:00 · Ethan B." },
    { name: "Dr. Kai Tanaka", booked: 4, next: "11:30 · Naomi F." },
    { name: "Nadia Rossi (RDH)", booked: 5, next: "11:00 · Sofia A." },
    { name: "Leo Martins (RDH)", booked: 3, next: "10:30 · James W." },
  ];
  return (
    <Card>
      <SectionHeader title="Today at a glance" icon={Clock} />
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-muted/70 p-3 text-center">
            <div className={"text-2xl font-semibold " + s.tone}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Providers</div>
        <ul className="space-y-2">
          {providers.map((p) => (
            <li key={p.name} className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">Next: {p.next}</div>
              </div>
              <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground ring-1 ring-border">
                {p.booked}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function TodayScheduleStrip() {
  const hours = ["8", "9", "10", "11", "12", "13", "14", "15", "16", "17"];
  const chairs = [1, 2, 3, 4] as const;
  const rowH = 42;
  const hourW = 90;
  return (
    <Card>
      <SectionHeader
        title="Today's schedule"
        icon={CalendarCheck}
        action={
          <Link to="/schedule" className="text-xs font-medium text-primary hover:underline">
            Open full schedule →
          </Link>
        }
      />
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid" style={{ gridTemplateColumns: `72px repeat(${hours.length}, ${hourW}px)` }}>
            <div />
            {hours.map((h) => (
              <div key={h} className="border-l border-dashed border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {h}:00
              </div>
            ))}
            {chairs.map((c) => (
              <div key={c} className="contents">
                <div className="flex items-center gap-1 py-2 text-xs font-medium text-muted-foreground">
                  <Circle className="h-2 w-2 fill-primary text-primary" />
                  Chair {c}
                </div>
                <div className="relative col-span-10 border-t border-border" style={{ gridColumn: `2 / span ${hours.length}`, height: rowH }}>
                  {todaysAppointments
                    .filter((a) => a.chair === c)
                    .map((a) => {
                      const [hh, mm] = a.start.split(":").map(Number);
                      const startMins = hh * 60 + mm - 8 * 60;
                      const left = (startMins / 60) * hourW;
                      const width = (a.duration / 60) * hourW;
                      const toneMap: Record<Appt, string> = {
                        confirmed: "bg-primary-soft text-accent-foreground",
                        arrived: "bg-primary text-primary-foreground",
                        "in-chair": "bg-emerald-500 text-primary-foreground",
                        unconfirmed: "bg-amber-100 text-amber-800",
                      };
                      return (
                        <div
                          key={a.id}
                          className={"absolute top-1 bottom-1 truncate rounded-lg px-2 py-1 text-[11px] font-medium " + toneMap[a.status]}
                          style={{ left, width: Math.max(width - 3, 40) }}
                          title={`${a.patient} — ${a.procedure}`}
                        >
                          {a.start} · {a.patient}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
type Appt = "confirmed" | "arrived" | "in-chair" | "unconfirmed";

function ProcedureMix() {
  const total = procedureMix.reduce((s, p) => s + p.pct, 0);
  let cursor = 0;
  const segs = procedureMix.map((p) => {
    const start = (cursor / total) * 100;
    cursor += p.pct;
    const end = (cursor / total) * 100;
    return { ...p, start, end };
  });
  return (
    <Card>
      <SectionHeader title="Procedure mix" icon={Activity} />
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segs.map((s) => (
          <div key={s.label} className={s.tone} style={{ width: `${s.end - s.start}%` }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {procedureMix.map((p) => (
          <li key={p.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={"h-2.5 w-2.5 rounded-sm " + p.tone} />
              <span>{p.label}</span>
            </div>
            <span className="text-muted-foreground">{p.pct}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RecentPatients() {
  const recent = patients.slice(0, 5);
  return (
    <Card>
      <SectionHeader
        title="Recent patients"
        icon={Users}
        action={<Link to="/patients" className="text-xs font-medium text-primary hover:underline">See all →</Link>}
      />
      <ul className="space-y-2">
        {recent.map((p) => (
          <li key={p.id}>
            <Link
              to="/patients/$id"
              params={{ id: p.id }}
              className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5 hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-accent-foreground">
                  {p.initials}
                </span>
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.chartNo} · {p.lastVisit}</div>
                </div>
              </div>
              <Pill tone={p.status === "Overdue" ? "danger" : p.status === "Recall" ? "warn" : "info"}>{p.status}</Pill>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BillingSnapshot() {
  const items = invoices.slice(0, 5);
  return (
    <Card>
      <SectionHeader
        title="Latest invoices"
        icon={DollarSign}
        action={<Link to="/billing" className="text-xs font-medium text-primary hover:underline">Billing →</Link>}
      />
      <ul className="space-y-2">
        {items.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">{inv.patient}</div>
              <div className="text-xs text-muted-foreground">{inv.id} · {inv.date}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">${inv.amount}</span>
              <Pill
                tone={
                  inv.status === "Paid" ? "success"
                    : inv.status === "Overdue" ? "danger"
                    : inv.status === "Partial" ? "warn"
                    : "muted"
                }
              >
                {inv.status}
              </Pill>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ChairUtilizationCard() {
  return (
    <Card>
      <SectionHeader title="Chair utilization" icon={Activity} action={<MoreHorizontal className="h-4 w-4 text-muted-foreground" />} />
      <ul className="space-y-4">
        {chairUtilization.map((c) => (
          <li key={c.chair}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{c.chair}</span>
              <span className="text-muted-foreground">{c.pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={
                  "h-full rounded-full " +
                  (c.pct > 85 ? "bg-primary" : c.pct > 70 ? "bg-emerald-500" : "bg-amber-400")
                }
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
