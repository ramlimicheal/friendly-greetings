import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  Share2,
  Users,
  DollarSign,
  Clock,
  Phone,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  Coffee,
  Stethoscope,
  Package,
  CalendarClock,
  CircleDot,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, Pill } from "@/components/app-shell";
import {
  todaysAppointments,
  revenueLast30,
  patients,
  invoices,
  inventory,
  chairUtilization,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center — Enamel Dental Clinic" },
      { name: "description", content: "Everything happening in the clinic right now — chairs, waiting room, follow-ups, and money." },
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

/* ---------- page ---------- */

function DashboardPage() {
  // Live "now" — pinned to 10:24 for demo continuity, ticks minute-by-minute after mount.
  const [nowMins, setNowMins] = useState(10 * 60 + 24);
  useEffect(() => {
    const t = setInterval(() => setNowMins((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const revenueToday = 8420;
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);

  return (
    <AppShell
      title="Good morning, Dr. Okafor"
      subtitle={`Tuesday, October 14 · ${todaysAppointments.length} visits booked · 4 chairs · 2 dentists on the floor`}
      actions={
        <>
          <GhostButton icon={RefreshCcw}>Sync</GhostButton>
          <GhostButton icon={Share2}>Daily report</GhostButton>
          <PrimaryButton icon={Plus}>New appointment</PrimaryButton>
        </>
      }
    >
      {/* Row 1 — Right Now hero band */}
      <RightNowBand nowMins={nowMins} />

      {/* Row 2 — KPIs */}
      <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          icon={Users}
          label="Visits today"
          value={String(todaysAppointments.length)}
          delta="+12%"
          up
          sub="3 arrived · 1 in chair"
        />
        <Kpi
          icon={DollarSign}
          label="Production today"
          value={`$${revenueToday.toLocaleString()}`}
          delta="+18%"
          up
          sub="Goal $9,500 · 89%"
          progress={89}
        />
        <Kpi
          icon={Stethoscope}
          label="Chair utilization"
          value="78%"
          delta="+4%"
          up
          sub="Chair 3 leads at 91%"
        />
        <Kpi
          icon={AlertTriangle}
          label="Outstanding A/R"
          value={`$${outstanding.toLocaleString()}`}
          delta="-6%"
          up={false}
          sub="2 overdue · 1 pending"
          tone="warn"
        />
      </section>

      {/* Row 3 — Timeline (full width, chairs) */}
      <section className="mt-4">
        <ChairTimeline nowMins={nowMins} />
      </section>

      {/* Row 4 — Three action queues */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <NoShowRisk />
        <MoneyToChase />
        <StockAlerts />
      </section>

      {/* Row 5 — Waiting room + Recalls + Production trend */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
        <WaitingRoom />
        <RecallsDue />
        <ProductionTrend />
      </section>
    </AppShell>
  );
}

/* ============================================================
   RIGHT NOW BAND — live pulse of the clinic
   ============================================================ */

function RightNowBand({ nowMins }: { nowMins: number }) {
  const inChair = todaysAppointments.filter((a) => a.status === "in-chair");
  const arrived = todaysAppointments.filter((a) => a.status === "arrived");
  const nextUp = todaysAppointments
    .filter((a) => toMins(a.start) >= nowMins)
    .sort((a, b) => toMins(a.start) - toMins(b.start))[0];

  const runningLate = todaysAppointments.find(
    (a) => a.status === "confirmed" && toMins(a.start) < nowMins - 5,
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary-soft/70 via-card to-card">
      <div className="grid grid-cols-1 divide-border md:grid-cols-[auto_1fr_1fr_1fr_auto] md:divide-x">
        {/* Live clock */}
        <div className="flex items-center gap-3 px-6 py-5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Right now
            </div>
            <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {fmt(nowMins)}
            </div>
          </div>
        </div>

        {/* In chair */}
        <PulseCol
          label="In chair"
          count={inChair.length}
          tint="text-emerald-600"
          empty="No patient in a chair"
          rows={inChair.map((a) => ({
            title: a.patient,
            meta: `Chair ${a.chair} · ${a.procedure}`,
            right: `${Math.max(0, nowMins - toMins(a.start))} min in`,
          }))}
        />

        {/* Waiting */}
        <PulseCol
          label="Waiting room"
          count={arrived.length}
          tint="text-primary"
          empty="Waiting room empty"
          rows={arrived.map((a) => ({
            title: a.patient,
            meta: a.procedure,
            right: `${Math.max(0, toMins(a.start) - nowMins)}m wait`,
          }))}
        />

        {/* Next up */}
        <div className="px-6 py-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Next up
          </div>
          {nextUp ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
                  {nextUp.start}
                </span>
                <span className="text-xs text-muted-foreground">
                  in {Math.max(0, toMins(nextUp.start) - nowMins)}m
                </span>
              </div>
              <div className="mt-1 truncate text-sm font-medium">{nextUp.patient}</div>
              <div className="truncate text-xs text-muted-foreground">
                Chair {nextUp.chair} · {nextUp.procedure}
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">Day's done.</div>
          )}
        </div>

        {/* Alert */}
        <div className="flex items-center gap-3 px-6 py-5">
          {runningLate ? (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-semibold text-amber-800">Running late</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {runningLate.patient} · {runningLate.start}
                </div>
                <button className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                  <Phone className="h-3 w-3" /> Call
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              On schedule
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PulseCol({
  label,
  count,
  tint,
  empty,
  rows,
}: {
  label: string;
  count: number;
  tint: string;
  empty: string;
  rows: { title: string; meta: string; right: string }[];
}) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className={"text-lg font-semibold " + tint}>{count}</div>
      </div>
      {rows.length === 0 ? (
        <div className="mt-3 text-sm text-muted-foreground">{empty}</div>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.slice(0, 2).map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium leading-tight">{r.title}</div>
                <div className="truncate text-xs text-muted-foreground">{r.meta}</div>
              </div>
              <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                {r.right}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
   KPI
   ============================================================ */

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  up,
  sub,
  progress,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  up: boolean;
  sub: string;
  progress?: number;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={
              "flex h-7 w-7 items-center justify-center rounded-lg " +
              (tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-primary-soft text-accent-foreground")
            }
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <span
          className={
            "inline-flex items-center gap-0.5 text-[11px] font-medium " +
            (up ? "text-emerald-600" : "text-red-600")
          }
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {typeof progress === "number" ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="mt-2 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

/* ============================================================
   CHAIR TIMELINE
   ============================================================ */

function ChairTimeline({ nowMins }: { nowMins: number }) {
  const hours = Array.from({ length: CLINIC_CLOSE - CLINIC_OPEN + 1 }, (_, i) => CLINIC_OPEN + i);
  const hourW = 96;
  const rowH = 56;
  const chairs = [1, 2, 3, 4] as const;

  const totalW = hours.length * hourW;
  const nowLeft = ((nowMins - CLINIC_OPEN * 60) / 60) * hourW;

  const toneMap: Record<string, string> = {
    confirmed: "bg-primary-soft text-accent-foreground border-primary/20",
    arrived: "bg-primary/15 text-primary border-primary/40",
    "in-chair": "bg-emerald-500 text-primary-foreground border-emerald-600",
    unconfirmed: "bg-amber-100 text-amber-900 border-amber-300",
  };

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">Today's chair timeline</div>
            <div className="text-xs text-muted-foreground">4 chairs · 8:00 – 18:00 · live view</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Legend swatch="bg-primary-soft" label="Confirmed" />
          <Legend swatch="bg-primary/40" label="Arrived" />
          <Legend swatch="bg-emerald-500" label="In chair" />
          <Legend swatch="bg-amber-200" label="Unconfirmed" />
          <Link to="/schedule" className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Open schedule <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-border">
        <div style={{ minWidth: totalW + 88 }}>
          {/* hour ruler */}
          <div className="sticky top-0 z-10 grid bg-card/95 backdrop-blur" style={{ gridTemplateColumns: `88px ${totalW}px` }}>
            <div className="border-b border-border" />
            <div className="relative border-b border-border" style={{ height: 32 }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute top-0 flex h-full items-center border-l border-dashed border-border pl-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  style={{ left: i * hourW, width: hourW }}
                >
                  {h}:00
                </div>
              ))}
            </div>
          </div>

          {/* chair rows */}
          <div className="relative grid" style={{ gridTemplateColumns: `88px ${totalW}px` }}>
            {/* Now line — spans all rows */}
            {nowMins >= CLINIC_OPEN * 60 && nowMins <= CLINIC_CLOSE * 60 && (
              <div
                className="pointer-events-none absolute top-0 z-20 h-full"
                style={{ left: 88 + nowLeft }}
              >
                <div className="relative h-full w-px bg-red-500/70">
                  <span className="absolute -left-1.5 -top-1 h-2 w-2 rounded-full bg-red-500" />
                  <span className="absolute -left-[22px] top-2 rounded-full bg-red-500 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                    {fmt(nowMins)}
                  </span>
                </div>
              </div>
            )}

            {chairs.map((c) => {
              const util = chairUtilization[c - 1]?.pct ?? 0;
              return (
                <div key={c} className="contents">
                  <div className="flex flex-col justify-center border-b border-border px-3 py-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <CircleDot className="h-3 w-3 text-primary" />
                      Chair {c}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{util}% booked</div>
                  </div>
                  <div className="relative border-b border-border" style={{ height: rowH }}>
                    {/* faint hour grid */}
                    {hours.map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full border-l border-dashed border-border/60"
                        style={{ left: i * hourW }}
                      />
                    ))}
                    {/* lunch band 12–13 */}
                    <div
                      className="absolute top-0 flex h-full items-center justify-center bg-muted/60"
                      style={{ left: 4 * hourW, width: hourW }}
                    >
                      <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    {todaysAppointments
                      .filter((a) => a.chair === c)
                      .map((a) => {
                        const start = toMins(a.start);
                        const left = ((start - CLINIC_OPEN * 60) / 60) * hourW;
                        const width = (a.duration / 60) * hourW;
                        const past = start + a.duration <= nowMins;
                        return (
                          <button
                            key={a.id}
                            className={
                              "group absolute top-1.5 bottom-1.5 flex flex-col justify-center overflow-hidden rounded-xl border px-2 text-left transition hover:z-30 hover:scale-[1.02] " +
                              toneMap[a.status] +
                              (past ? " opacity-60" : "")
                            }
                            style={{ left: left + 2, width: Math.max(width - 4, 44) }}
                            title={`${a.patient} — ${a.procedure} (${a.provider})`}
                          >
                            <div className="truncate text-[11px] font-semibold leading-tight">
                              {a.patient}
                            </div>
                            <div className="truncate text-[10px] leading-tight opacity-80">
                              {a.start} · {a.procedure}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={"h-2.5 w-2.5 rounded-sm " + swatch} />
      {label}
    </span>
  );
}

/* ============================================================
   ACTION QUEUES
   ============================================================ */

function NoShowRisk() {
  const risks = todaysAppointments.filter((a) => a.status === "unconfirmed");
  return (
    <QueueCard
      icon={AlertTriangle}
      title="No-show risk"
      count={risks.length}
      tone="warn"
      empty="Everyone confirmed 👌"
      footer={<span className="text-muted-foreground">Auto-remind sent 2h ago</span>}
    >
      {risks.map((a) => (
        <li
          key={a.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{a.patient}</div>
            <div className="truncate text-xs text-muted-foreground">
              {a.start} · {a.procedure} · Chair {a.chair}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              aria-label="Text"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="Call"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
          </div>
        </li>
      ))}
    </QueueCard>
  );
}

function MoneyToChase() {
  const items = invoices
    .filter((i) => i.status === "Overdue" || i.status === "Partial" || i.status === "Pending")
    .slice(0, 4);
  const total = items.reduce((s, i) => s + i.amount, 0);
  return (
    <QueueCard
      icon={DollarSign}
      title="Money to chase"
      count={items.length}
      tone="default"
      subtitle={`$${total.toLocaleString()} across ${items.length}`}
      empty="A/R is clean this week"
      footer={
        <Link to="/billing" className="text-primary hover:underline">
          Open billing →
        </Link>
      }
    >
      {items.map((inv) => (
        <li
          key={inv.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
        >
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
    </QueueCard>
  );
}

function StockAlerts() {
  const low = inventory.filter((i) => i.onHand <= i.reorderAt);
  return (
    <QueueCard
      icon={Package}
      title="Low stock"
      count={low.length}
      tone="warn"
      empty="Inventory looks healthy"
      footer={
        <Link to="/inventory" className="text-primary hover:underline">
          Manage inventory →
        </Link>
      }
    >
      {low.map((i) => {
        const pct = Math.round((i.onHand / (i.reorderAt * 1.5)) * 100);
        return (
          <li key={i.id} className="rounded-xl border border-border px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{i.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {i.supplier} · reorder at {i.reorderAt}
                </div>
              </div>
              <button className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted">
                Reorder
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={"h-full rounded-full " + (i.onHand === 0 ? "bg-red-500" : "bg-amber-500")}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                {i.onHand} / {i.reorderAt} {i.unit}
              </span>
            </div>
          </li>
        );
      })}
    </QueueCard>
  );
}

function QueueCard({
  icon: Icon,
  title,
  count,
  tone,
  subtitle,
  empty,
  children,
  footer,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  tone: "warn" | "default";
  subtitle?: string;
  empty: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : false;
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <span
            className={
              "flex h-8 w-8 items-center justify-center rounded-full " +
              (tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-primary-soft text-accent-foreground")
            }
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {subtitle ? (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            ) : null}
          </div>
        </div>
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums " +
            (tone === "warn" ? "bg-amber-100 text-amber-900" : "bg-primary-soft text-accent-foreground")
          }
        >
          {count}
        </span>
      </div>
      <ul className="flex-1 space-y-2 p-4">
        {isEmpty ? (
          <li className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {empty}
          </li>
        ) : (
          children
        )}
      </ul>
      {footer ? (
        <div className="border-t border-border px-4 py-2.5 text-xs">{footer}</div>
      ) : null}
    </div>
  );
}

/* ============================================================
   WAITING / RECALLS / TREND
   ============================================================ */

function WaitingRoom() {
  const arrived = todaysAppointments.filter((a) => a.status === "arrived");
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
            <Clock className="h-4 w-4" />
          </span>
          <div className="text-sm font-semibold">Waiting room</div>
        </div>
        <span className="text-xs text-muted-foreground">{arrived.length} checked in</span>
      </div>
      <ul className="space-y-2 p-4">
        {arrived.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No one is waiting.
          </li>
        ) : (
          arrived.map((a) => {
            const p = patients.find((pt) => pt.id === a.patientId);
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-accent-foreground">
                  {p?.initials ?? a.patient.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.patient}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.procedure} · Chair {a.chair}
                  </div>
                </div>
                <button className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90">
                  Seat
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function RecallsDue() {
  const recall = patients.filter((p) => p.status === "Recall" || p.status === "Overdue").slice(0, 4);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
            <Users className="h-4 w-4" />
          </span>
          <div className="text-sm font-semibold">Recalls due</div>
        </div>
        <Link to="/patients" className="text-xs font-medium text-primary hover:underline">
          All patients →
        </Link>
      </div>
      <ul className="space-y-2 p-4">
        {recall.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-accent-foreground">
              {p.initials}
            </span>
            <div className="min-w-0 flex-1">
              <Link to="/patients/$id" params={{ id: p.id }} className="truncate text-sm font-medium hover:underline">
                {p.name}
              </Link>
              <div className="truncate text-xs text-muted-foreground">
                Last visit {p.lastVisit} · {p.insurance}
              </div>
            </div>
            <Pill tone={p.status === "Overdue" ? "danger" : "warn"}>{p.status}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductionTrend() {
  const data = revenueLast30;
  const max = Math.max(...data);
  const w = 640, h = 160;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 20) - 8] as const);
  const line = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const total = data.reduce((s, v) => s + v, 0);
  const avg = Math.round(total / data.length);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
            <DollarSign className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">Production — 30 days</div>
            <div className="text-xs text-muted-foreground">
              Total <span className="font-medium text-foreground">${total.toLocaleString()}</span> · Avg{" "}
              <span className="font-medium text-foreground">${avg.toLocaleString()}</span>/day
            </div>
          </div>
        </div>
        <Link to="/reports" className="text-xs font-medium text-primary hover:underline">
          Reports →
        </Link>
      </div>
      <div className="px-4 pb-4 pt-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.09 165)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="oklch(0.55 0.09 165)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              y1={h * f}
              x2={w}
              y2={h * f}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="3 4"
            />
          ))}
          <path d={area} fill="url(#rev)" />
          <path
            d={line}
            fill="none"
            stroke="oklch(0.55 0.09 165)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Sep 15</span>
          <span>Sep 22</span>
          <span>Sep 29</span>
          <span>Oct 06</span>
          <span>Oct 13</span>
        </div>
      </div>
    </div>
  );
}
