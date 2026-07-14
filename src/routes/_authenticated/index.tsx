import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Share2,
  Activity,
  Users,
  CalendarCheck,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Circle,
  AlertTriangle,
  Phone,
  MessageSquare,
  Package,
  CheckCircle2,
  Stethoscope,
} from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, SectionHeader, Pill } from "@/components/app-shell";
import {
  todaysAppointments,
  revenueLast30,
  chairUtilization,
  patients,
  invoices,
  inventory,
} from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import {
  endOfDay,
  listAppointmentsForRange,
  startOfDay,
  type AppointmentWithPatient,
} from "@/lib/appointments-api";


export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Enamel Dental Clinic" },
      { name: "description", content: "Clinic-wide overview: today's schedule, revenue, chair utilization, and patient flow." },
    ],
  }),
  component: DashboardPage,
});

/* ---------- helpers ---------- */

const CLINIC_OPEN = 8;
const CLINIC_CLOSE = 18;

function toMins(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fmt(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function DashboardPage() {
  // Live "now" — pinned to 10:24 for demo, ticks every minute after mount.
  const [nowMins, setNowMins] = useState(10 * 60 + 24);
  useEffect(() => {
    const t = setInterval(() => setNowMins((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

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
          caption={<>Goal <strong className="text-foreground">$9,500</strong> · 89% reached</>}
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

      {/* MID ROW — live schedule + right-now snapshot */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <TodayScheduleStrip nowMins={nowMins} />
        <RightNowSnapshot nowMins={nowMins} />
      </section>

      {/* ACTION QUEUES */}
      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NoShowRisk />
        <MoneyToChase />
        <StockAlerts />
      </section>

      {/* BOTTOM ROW */}
      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <WaitingRoom />
        <RecallsDue />
        <ChairUtilizationCard />
      </section>
    </AppShell>
  );
}

/* ---------- KPI widgets ---------- */

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

/* ---------- Today's schedule (live now-line) ---------- */

function TodayScheduleStrip({ nowMins }: { nowMins: number }) {
  const hours = Array.from({ length: CLINIC_CLOSE - CLINIC_OPEN + 1 }, (_, i) => CLINIC_OPEN + i);
  const chairs = [1, 2, 3, 4] as const;
  const rowH = 44;
  const labelW = 64;
  const hourW = 64;
  const totalW = hours.length * hourW;
  const nowLeft = ((nowMins - CLINIC_OPEN * 60) / 60) * hourW;
  const showNow = nowMins >= CLINIC_OPEN * 60 && nowMins <= CLINIC_CLOSE * 60;


  const toneMap: Record<string, string> = {
    confirmed: "bg-primary-soft text-accent-foreground",
    arrived: "bg-primary text-primary-foreground",
    "in-chair": "bg-emerald-500 text-primary-foreground",
    unconfirmed: "bg-amber-100 text-amber-800",
  };

  return (
    <Card>
      <SectionHeader
        title="Today's schedule"
        icon={CalendarCheck}
        action={
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {fmt(nowMins)} now
            </span>
            <Link to="/schedule" className="text-xs font-medium text-primary hover:underline">
              Open full schedule →
            </Link>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <div style={{ minWidth: totalW + labelW }}>
          <div className="grid" style={{ gridTemplateColumns: `${labelW}px repeat(${hours.length}, ${hourW}px)` }}>
            <div />
            {hours.map((h) => (
              <div key={h} className="border-l border-dashed border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {h}:00
              </div>
            ))}
          </div>

          <div className="relative grid" style={{ gridTemplateColumns: `${labelW}px ${totalW}px` }}>
            {showNow && (
              <div
                className="pointer-events-none absolute top-0 z-20 h-full"
                style={{ left: labelW + nowLeft }}
              >
                <div className="relative h-full w-px bg-red-500/70">
                  <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                </div>
              </div>
            )}
            {chairs.map((c) => (
              <div key={c} className="contents">
                <div className="flex items-center gap-1 border-t border-border py-2 text-xs font-medium text-muted-foreground">
                  <Circle className="h-2 w-2 fill-primary text-primary" />
                  <span className="truncate">Ch {c}</span>
                </div>
                <div className="relative border-t border-border" style={{ height: rowH }}>
                  {todaysAppointments
                    .filter((a) => a.chair === c)
                    .map((a) => {
                      const start = toMins(a.start);
                      const left = ((start - CLINIC_OPEN * 60) / 60) * hourW;
                      const width = (a.duration / 60) * hourW;
                      const past = start + a.duration <= nowMins;
                      return (
                        <div
                          key={a.id}
                          className={
                            "absolute top-1 bottom-1 truncate rounded-lg px-2 py-1 text-[11px] font-medium " +
                            toneMap[a.status] +
                            (past ? " opacity-55" : "")
                          }
                          style={{ left, width: Math.max(width - 3, 36) }}
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

/* ---------- Right-now snapshot (replaces "Today at a glance") ---------- */

function RightNowSnapshot({ nowMins }: { nowMins: number }) {
  const inChair = todaysAppointments.filter((a) => a.status === "in-chair");
  const arrived = todaysAppointments.filter((a) => a.status === "arrived");
  const nextUp = todaysAppointments
    .filter((a) => toMins(a.start) >= nowMins)
    .sort((a, b) => toMins(a.start) - toMins(b.start))[0];
  const runningLate = todaysAppointments.find(
    (a) => a.status === "confirmed" && toMins(a.start) < nowMins - 5,
  );

  const stats = [
    { label: "Booked", value: todaysAppointments.length, tone: "text-foreground" },
    { label: "Arrived", value: arrived.length, tone: "text-primary" },
    { label: "In chair", value: inChair.length, tone: "text-primary" },
    { label: "Late", value: runningLate ? 1 : 0, tone: runningLate ? "text-red-600" : "text-muted-foreground" },
  ];

  return (
    <Card>
      <SectionHeader
        title="Right now"
        icon={Clock}
        action={
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-mono tabular-nums">{fmt(nowMins)}</span>
          </span>
        }
      />
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-muted/70 p-3 text-center">
            <div className={"text-2xl font-semibold " + s.tone}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <ul className="mt-5 space-y-2">
        {inChair.map((a) => (
          <li key={a.id} className="flex list-none items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                <span className="truncate text-sm font-medium">{a.patient}</span>
              </div>
              <div className="truncate text-xs text-muted-foreground">Chair {a.chair} · {a.procedure}</div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {Math.max(0, nowMins - toMins(a.start))}m in
            </span>
          </li>
        ))}

        {nextUp && (
          <li className="flex list-none items-center justify-between rounded-2xl bg-primary-soft/60 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">Next up</div>
              <div className="truncate text-sm font-medium">{nextUp.patient}</div>
              <div className="truncate text-xs text-muted-foreground">Chair {nextUp.chair} · {nextUp.procedure}</div>
            </div>
            <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-semibold text-foreground ring-1 ring-border">
              in {Math.max(0, toMins(nextUp.start) - nowMins)}m
            </span>
          </li>
        )}

        {runningLate && (
          <li className="flex list-none items-center justify-between rounded-2xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                <AlertTriangle className="h-3 w-3" /> Running late
              </div>
              <div className="truncate text-sm font-medium">{runningLate.patient}</div>
              <div className="truncate text-xs text-muted-foreground">{runningLate.start} · {runningLate.procedure}</div>
            </div>
            <button className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90">
              <Phone className="h-3 w-3" /> Call
            </button>
          </li>
        )}
      </ul>
    </Card>

  );
}

/* ---------- Action queues ---------- */

function NoShowRisk() {
  const risks = todaysAppointments.filter((a) => a.status === "unconfirmed");
  return (
    <Card>
      <SectionHeader
        title="No-show risk"
        icon={AlertTriangle}
        action={<Pill tone="warn">{risks.length}</Pill>}
      />
      {risks.length === 0 ? (
        <EmptyRow>Everyone confirmed for today.</EmptyRow>
      ) : (
        <ul className="space-y-2">
          {risks.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{a.patient}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {a.start} · Chair {a.chair} · {a.procedure}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button aria-label="Text" className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-card hover:text-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
                <button aria-label="Call" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90">
                  <Phone className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function MoneyToChase() {
  const items = invoices
    .filter((i) => i.status === "Overdue" || i.status === "Partial" || i.status === "Pending")
    .slice(0, 4);
  const total = items.reduce((s, i) => s + i.amount, 0);
  return (
    <Card>
      <SectionHeader
        title="Money to chase"
        icon={DollarSign}
        action={
          <Link to="/billing" className="text-xs font-medium text-primary hover:underline">
            ${total.toLocaleString()} →
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyRow>A/R is clean this week.</EmptyRow>
      ) : (
        <ul className="space-y-2">
          {items.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{inv.patient}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {inv.id} · {inv.date} · {inv.method}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">${inv.amount}</span>
                <Pill
                  tone={
                    inv.status === "Overdue"
                      ? "danger"
                      : inv.status === "Partial"
                        ? "warn"
                        : "muted"
                  }
                >
                  {inv.status}
                </Pill>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StockAlerts() {
  const low = inventory.filter((i) => i.onHand <= i.reorderAt);
  return (
    <Card>
      <SectionHeader
        title="Low stock"
        icon={Package}
        action={
          <Link to="/inventory" className="text-xs font-medium text-primary hover:underline">
            Inventory →
          </Link>
        }
      />
      {low.length === 0 ? (
        <EmptyRow>Inventory looks healthy.</EmptyRow>
      ) : (
        <ul className="space-y-2">
          {low.map((i) => {
            const pct = Math.min(100, Math.round((i.onHand / (i.reorderAt * 1.5)) * 100));
            return (
              <li key={i.id} className="rounded-2xl bg-muted/60 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{i.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {i.supplier} · reorder at {i.reorderAt}
                    </div>
                  </div>
                  <button className="shrink-0 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground ring-1 ring-border hover:bg-muted">
                    Reorder
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card ring-1 ring-border">
                    <div
                      className={"h-full rounded-full " + (i.onHand === 0 ? "bg-red-500" : "bg-amber-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                    {i.onHand} / {i.reorderAt} {i.unit}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Bottom row ---------- */

function WaitingRoom() {
  const arrived = todaysAppointments.filter((a) => a.status === "arrived");
  return (
    <Card>
      <SectionHeader
        title="Waiting room"
        icon={Clock}
        action={<Pill tone="info">{arrived.length} checked in</Pill>}
      />
      {arrived.length === 0 ? (
        <EmptyRow>No one is waiting.</EmptyRow>
      ) : (
        <ul className="space-y-2">
          {arrived.map((a) => {
            const p = patients.find((pt) => pt.id === a.patientId);
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-accent-foreground">
                  {p?.initials ?? a.patient.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.patient}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.procedure} · Chair {a.chair}</div>
                </div>
                <button className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90">
                  Seat
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function RecallsDue() {
  const recall = patients.filter((p) => p.status === "Recall" || p.status === "Overdue").slice(0, 5);
  return (
    <Card>
      <SectionHeader
        title="Recalls due"
        icon={Users}
        action={<Link to="/patients" className="text-xs font-medium text-primary hover:underline">All patients →</Link>}
      />
      <ul className="space-y-2">
        {recall.map((p) => (
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
                  <div className="text-xs text-muted-foreground">Last visit {p.lastVisit}</div>
                </div>
              </div>
              <Pill tone={p.status === "Overdue" ? "danger" : "warn"}>{p.status}</Pill>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ChairUtilizationCard() {
  return (
    <Card>
      <SectionHeader title="Chair utilization" icon={Activity} />
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

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-muted/40 px-3 py-6 text-sm text-muted-foreground">
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      {children}
    </div>
  );
}
