import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Circle } from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, SectionHeader } from "@/components/app-shell";
import { todaysAppointments, staff } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — Enamel Dental Clinic" },
      { name: "description", content: "Chair-by-chair daily and weekly schedule for the whole clinic." },
    ],
  }),
  component: SchedulePage,
});

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-primary-soft text-accent-foreground ring-1 ring-primary/20",
  arrived: "bg-primary text-primary-foreground",
  "in-chair": "bg-emerald-500 text-primary-foreground",
  unconfirmed: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
};

function SchedulePage() {
  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8–17
  const chairs = [1, 2, 3, 4] as const;
  const hourH = 60;

  return (
    <AppShell
      title="Schedule"
      subtitle="Tuesday, October 14, 2025 · 4 chairs · Day view"
      actions={
        <>
          <div className="flex items-center gap-1">
            <button className="rounded-full border border-border p-2 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
            <GhostButton>Today</GhostButton>
            <button className="rounded-full border border-border p-2 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted p-1">
            {["Day", "Week", "Month"].map((v, i) => (
              <button key={v} className={"rounded-full px-3 py-1.5 text-xs font-medium " + (i === 0 ? "bg-card" : "text-muted-foreground")}>{v}</button>
            ))}
          </div>
          <PrimaryButton icon={Plus}>New appointment</PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="!p-0 overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: `72px repeat(${chairs.length}, 1fr)` }}>
            <div />
            {chairs.map((c) => (
              <div key={c} className="border-l border-border bg-muted/40 px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Circle className="h-2 w-2 fill-primary text-primary" /> Chair {c}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {c === 1 && "Hygiene · Nadia"}
                  {c === 2 && "Restorative · Dr. Rina"}
                  {c === 3 && "Surgical · Dr. Kai"}
                  {c === 4 && "Perio · Leo"}
                </div>
              </div>
            ))}

            {/* time rows */}
            {hours.map((h) => (
              <div key={h} className="contents">
                <div className="border-t border-border px-2 py-1 text-right text-[11px] font-medium text-muted-foreground" style={{ height: hourH }}>
                  {h}:00
                </div>
                {chairs.map((c) => (
                  <div key={c} className="relative border-l border-t border-border" style={{ height: hourH }}>
                    {/* half-hour line */}
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/60" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* absolutely positioned appointments layer */}
          <div className="relative -mt-[600px]" style={{ height: hours.length * hourH }}>
            <div className="grid h-full" style={{ gridTemplateColumns: `72px repeat(${chairs.length}, 1fr)` }}>
              <div />
              {chairs.map((c) => (
                <div key={c} className="relative">
                  {todaysAppointments.filter((a) => a.chair === c).map((a) => {
                    const [hh, mm] = a.start.split(":").map(Number);
                    const top = ((hh - 8) * 60 + mm) * (hourH / 60);
                    const height = a.duration * (hourH / 60);
                    return (
                      <div
                        key={a.id}
                        className={"absolute left-1 right-1 rounded-xl px-2 py-1.5 text-[11px] " + STATUS_TONE[a.status]}
                        style={{ top, height: height - 3 }}
                      >
                        <div className="font-semibold">{a.start} · {a.patient}</div>
                        <div className="opacity-80">{a.procedure}</div>
                        <div className="mt-0.5 text-[10px] opacity-70">{a.provider}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="Legend" />
            <ul className="space-y-2 text-sm">
              {[
                { k: "confirmed", label: "Confirmed" },
                { k: "arrived", label: "Arrived" },
                { k: "in-chair", label: "In chair" },
                { k: "unconfirmed", label: "Needs confirmation" },
              ].map((l) => (
                <li key={l.k} className="flex items-center gap-2">
                  <span className={"h-3 w-6 rounded-md " + STATUS_TONE[l.k]} />
                  <span>{l.label}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="On the floor" />
            <ul className="space-y-3">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className={"flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground " + s.color}>
                    {s.initials}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.role}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Waitlist" />
            <ul className="space-y-2">
              {[
                { n: "Grace Lin", need: "Cleaning · any afternoon" },
                { n: "David Osei", need: "Emergency · today" },
                { n: "Mia Petrov", need: "Whitening delivery" },
              ].map((w) => (
                <li key={w.n} className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{w.n}</div>
                    <div className="text-xs text-muted-foreground">{w.need}</div>
                  </div>
                  <button className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">Slot in</button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
