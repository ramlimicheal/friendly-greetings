import { createFileRoute } from "@tanstack/react-router";
import { useRequirePermission } from "@/hooks/use-permissions";
import { useEffect, useState } from "react";
import { Download, DollarSign, TrendingUp, Users, Flame } from "lucide-react";
import { AppShell, Card, GhostButton, SectionHeader } from "@/components/app-shell";
import { revenueLast30, procedureMix } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Enamel Dental Clinic" },
      { name: "description", content: "Revenue, production, chair utilization, and patient metrics for the practice." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  useRequirePermission(["reports.view","reports.viewOwn"] as const);
  return (
    <AppShell
      title="Reports"
      subtitle="Practice performance · Last 30 days"
      actions={<GhostButton icon={Download}>Export PDF</GhostButton>}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={DollarSign} label="Production" value="$187,410" delta="+18%" />
        <Stat icon={TrendingUp} label="Collections" value="$164,220" delta="+12%" />
        <Stat icon={Users} label="New patients" value="42" delta="+7" />
        <Stat icon={TrendingUp} label="Case acceptance" value="72%" delta="+4%" />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <RevenueBig />
        <ProductionByProvider />
      </div>

      <div className="mt-4">
        <ChairHeatmap />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ProcedureMixCard />
        <NewPatientsCard />
        <RetentionCard />
      </div>
    </AppShell>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const CHAIRS = [1, 2, 3, 4];

function heatColor(intensity: number): string {
  // 0..1 → light-primary → strong
  if (intensity === 0) return "bg-muted";
  if (intensity < 0.25) return "bg-primary/15";
  if (intensity < 0.5) return "bg-primary/35";
  if (intensity < 0.75) return "bg-primary/60";
  return "bg-primary";
}

function ChairHeatmap() {
  // grid: [chair][dayOfWeek][hour] = minutes booked in last 30 days
  const [grid, setGrid] = useState<Record<number, Record<number, Record<number, number>>>>({});
  const [loading, setLoading] = useState(true);
  const [maxVal, setMaxVal] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const { data, error } = await supabase
        .from("appointments")
        .select("start_at, duration_min, chair, status")
        .gte("start_at", from.toISOString())
        .not("status", "in", "(cancelled,no-show)");
      if (error) { setLoading(false); return; }
      const g: Record<number, Record<number, Record<number, number>>> = {};
      let mx = 0;
      for (const r of data ?? []) {
        const d = new Date(r.start_at as string);
        const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
        const hr = d.getHours();
        if (hr < 8 || hr > 17) continue;
        g[r.chair] ??= {};
        g[r.chair][dow] ??= {};
        g[r.chair][dow][hr] = (g[r.chair][dow][hr] ?? 0) + (r.duration_min as number);
        if (g[r.chair][dow][hr] > mx) mx = g[r.chair][dow][hr];
      }
      setGrid(g);
      setMaxVal(mx);
      setLoading(false);
    })();
  }, []);

  return (
    <Card>
      <SectionHeader title="Chair utilization heatmap" icon={Flame} />
      <p className="mb-3 text-xs text-muted-foreground">Booked minutes per hour, last 30 days. Darker = busier.</p>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : maxVal === 0 ? (
        <p className="text-xs text-muted-foreground">No appointments yet in the last 30 days.</p>
      ) : (
        <div className="space-y-4">
          {CHAIRS.map((chair) => (
            <div key={chair}>
              <div className="mb-1 text-xs font-semibold">Chair {chair}</div>
              <div className="overflow-x-auto">
                <div className="inline-grid gap-1" style={{ gridTemplateColumns: `48px repeat(${HOURS.length}, 32px)` }}>
                  <div />
                  {HOURS.map((h) => (<div key={h} className="text-center text-[10px] text-muted-foreground">{h}</div>))}
                  {DAYS.map((day, di) => (
                    <div key={day} className="contents">
                      <div className="flex items-center text-[10px] font-medium text-muted-foreground">{day}</div>
                      {HOURS.map((h) => {
                        const v = grid[chair]?.[di]?.[h] ?? 0;
                        const intensity = maxVal > 0 ? v / maxVal : 0;
                        return (
                          <div key={h} className={"h-6 rounded-sm " + heatColor(intensity)} title={`${day} ${h}:00 · ${v} min`} />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            <span className="h-3 w-4 rounded-sm bg-muted" />
            <span className="h-3 w-4 rounded-sm bg-primary/15" />
            <span className="h-3 w-4 rounded-sm bg-primary/35" />
            <span className="h-3 w-4 rounded-sm bg-primary/60" />
            <span className="h-3 w-4 rounded-sm bg-primary" />
            <span>More</span>
          </div>
        </div>
      )}
    </Card>
  );
}


function Stat({ icon: Icon, label, value, delta }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; delta: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-accent-foreground">{delta}</span>
      </div>
      <div className="mt-3 text-4xl font-semibold tracking-tight">{value}</div>
    </Card>
  );
}

function RevenueBig() {
  const data = revenueLast30;
  const max = Math.max(...data);
  return (
    <Card>
      <SectionHeader title="Daily production" />
      <div className="flex h-64 items-end gap-1">
        {data.map((v, i) => (
          <div key={i} className="group relative flex-1">
            <div className={"w-full rounded-t-md " + (i === data.length - 1 ? "bg-emerald-500" : "bg-primary")} style={{ height: `${(v / max) * 100}%` }} />
            <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background group-hover:block">
              ${v.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Sep 15</span><span>Oct 14</span>
      </div>
    </Card>
  );
}

function ProductionByProvider() {
  const rows = [
    { n: "Dr. Rina Okafor", v: 82_400, pct: 100, color: "bg-primary" },
    { n: "Dr. Kai Tanaka", v: 61_820, pct: 75, color: "bg-emerald-500" },
    { n: "Nadia Rossi (RDH)", v: 24_600, pct: 30, color: "bg-teal-500" },
    { n: "Leo Martins (RDH)", v: 18_590, pct: 23, color: "bg-cyan-500" },
  ];
  return (
    <Card>
      <SectionHeader title="Production by provider" />
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.n}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{r.n}</span>
              <span className="text-muted-foreground">${r.v.toLocaleString()}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={"h-full rounded-full " + r.color} style={{ width: `${r.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ProcedureMixCard() {
  return (
    <Card>
      <SectionHeader title="Procedure mix" />
      <ul className="space-y-2">
        {procedureMix.map((p) => (
          <li key={p.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={"h-2.5 w-2.5 rounded-sm " + p.tone} />
                <span className="font-medium">{p.label}</span>
              </div>
              <span className="text-muted-foreground">{p.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={"h-full rounded-full " + p.tone} style={{ width: `${p.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NewPatientsCard() {
  const data = [3, 5, 4, 7, 6, 8, 5, 9, 7, 11, 8, 12];
  const max = Math.max(...data);
  return (
    <Card>
      <SectionHeader title="New patients / week" />
      <div className="flex h-40 items-end gap-2">
        {data.map((v, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-primary/80" style={{ height: `${(v / max) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Avg 7.1/wk · Referral rate 34%</div>
    </Card>
  );
}

function RetentionCard() {
  return (
    <Card>
      <SectionHeader title="Recall retention" />
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.93 0.04 165)" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.55 0.09 165)" strokeWidth="3.5"
              strokeDasharray={`${78} ${100}`} strokeLinecap="round" pathLength={100} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold">78%</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">retained</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          <li className="flex items-center justify-between"><span>Retained</span><span className="font-medium">312</span></li>
          <li className="flex items-center justify-between"><span>Overdue</span><span className="font-medium">54</span></li>
          <li className="flex items-center justify-between"><span>Lost</span><span className="font-medium text-muted-foreground">33</span></li>
        </ul>
      </div>
    </Card>
  );
}
