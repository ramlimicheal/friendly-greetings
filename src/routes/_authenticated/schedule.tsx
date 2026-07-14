import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Circle, ListChecks } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell, Card, GhostButton, PrimaryButton, SectionHeader } from "@/components/app-shell";
import { AppointmentFormDialog } from "@/components/appointment-form-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  APPOINTMENT_STATUSES,
  STATUS_LABEL,
  createAppointment,
  deleteAppointment,
  endOfDay,
  listAppointmentsForRange,
  rescheduleAppointment,
  startOfDay,
  updateAppointment,
  type AppointmentInsert,
  type AppointmentStatus,
  type AppointmentWithPatient,
} from "@/lib/appointments-api";
import { listWaitlist, markWaitlistScheduled, type WaitlistWithPatient } from "@/lib/waitlist-api";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — Enamel Dental Clinic" },
      { name: "description", content: "Chair-by-chair daily schedule for the whole clinic, live." },
    ],
  }),
  component: SchedulePage,
});

const STATUS_TONE: Record<AppointmentStatus, string> = {
  unconfirmed: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  confirmed: "bg-primary-soft text-accent-foreground ring-1 ring-primary/20",
  arrived: "bg-primary text-primary-foreground",
  "in-chair": "bg-emerald-500 text-primary-foreground",
  completed: "bg-muted text-muted-foreground ring-1 ring-border",
  cancelled: "bg-red-100 text-red-700 line-through",
  "no-show": "bg-red-100 text-red-700",
};

const CHAIRS = [1, 2, 3, 4] as const;
const CHAIR_MEANING: Record<number, string> = {
  1: "Hygiene",
  2: "Restorative",
  3: "Surgical",
  4: "Perio",
};

function SchedulePage() {
  const [date, setDate] = useState<Date>(() => new Date());
  const [items, setItems] = useState<AppointmentWithPatient[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragMsg, setDragMsg] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentWithPatient | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | undefined>();
  const [defaultChair, setDefaultChair] = useState<number | undefined>();
  const [prefill, setPrefill] = useState<{ patient_id?: string; procedure?: string; provider?: string; duration_min?: number } | undefined>();
  const [waitlistFill, setWaitlistFill] = useState<WaitlistWithPatient | null>(null);
  const dragId = useRef<string | null>(null);

  const from = useMemo(() => startOfDay(date), [date]);
  const to = useMemo(() => endOfDay(date), [date]);

  const load = async () => {
    setLoading(true);
    try {
      const [appts, wl] = await Promise.all([
        listAppointmentsForRange(from, to),
        listWaitlist("active"),
      ]);
      setItems(appts);
      setWaitlist(wl);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.getTime(), to.getTime()]);

  useEffect(() => {
    const channel = supabase
      .channel(`appts-${from.toISOString()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.getTime()]);

  const hours = Array.from({ length: 10 }, (_, i) => i + 8);
  const hourH = 60;

  const openNew = (chair?: number, hour?: number) => {
    setEditing(null);
    setPrefill(undefined);
    if (hour != null) {
      const d = new Date(date);
      d.setHours(hour, 0, 0, 0);
      setDefaultStart(d);
    } else {
      setDefaultStart(undefined);
    }
    setDefaultChair(chair);
    setDialogOpen(true);
  };

  const openFromWaitlist = (w: WaitlistWithPatient, chair?: number, hour?: number) => {
    setEditing(null);
    setWaitlistFill(w);
    setPrefill({
      patient_id: w.patient_id,
      procedure: w.procedure,
      provider: w.preferred_provider ?? "",
      duration_min: w.duration_min,
    });
    if (hour != null) {
      const d = new Date(date);
      d.setHours(hour, 0, 0, 0);
      setDefaultStart(d);
    } else {
      setDefaultStart(undefined);
    }
    setDefaultChair(chair ?? w.preferred_chair ?? undefined);
    setDialogOpen(true);
  };

  const openEdit = (a: AppointmentWithPatient) => {
    setEditing(a);
    setPrefill(undefined);
    setDefaultStart(undefined);
    setDefaultChair(undefined);
    setDialogOpen(true);
  };

  const submit = async (values: AppointmentInsert) => {
    if (editing) {
      const prevStatus = editing.status;
      await updateAppointment(editing.id, values);
      // Auto-fill: if we just cancelled/no-showed an appointment, prompt waitlist
      if (prevStatus !== values.status && (values.status === "cancelled" || values.status === "no-show")) {
        const match = waitlist.find((w) => w.duration_min <= editing.duration_min &&
          (!w.preferred_provider || w.preferred_provider === editing.provider) &&
          (!w.preferred_chair || w.preferred_chair === editing.chair));
        if (match) {
          setTimeout(() => {
            if (confirm(`Slot freed! Book "${match.patient_name}" (P${match.priority} · ${match.procedure}) into this ${editing.duration_min}-min slot?`)) {
              openFromWaitlist(match, editing.chair, new Date(editing.start_at).getHours());
            }
          }, 100);
        }
      }
    } else {
      await createAppointment(values);
      if (waitlistFill) {
        await markWaitlistScheduled(waitlistFill.id);
        setWaitlistFill(null);
      }
    }
    await load();
  };

  const remove = async () => {
    if (!editing) return;
    await deleteAppointment(editing.id);
    await load();
  };

  const onDropAt = async (chair: number, hour: number, minute: number) => {
    const id = dragId.current;
    dragId.current = null;
    if (!id) return;
    const appt = items.find((a) => a.id === id);
    if (!appt) return;
    const newStart = new Date(date);
    newStart.setHours(hour, minute, 0, 0);
    // Same slot? no-op
    const cur = new Date(appt.start_at);
    if (cur.getHours() === hour && cur.getMinutes() === minute && appt.chair === chair) return;
    setDragMsg(null);
    const res = await rescheduleAppointment(appt, chair, newStart);
    if (!res.ok) {
      const c = res.conflicts[0];
      const t = new Date(c.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      setDragMsg(`Can't move: ${c.conflict_type} conflict at ${t}.`);
      setTimeout(() => setDragMsg(null), 3500);
      return;
    }
    await load();
  };

  const prev = () => shiftDate(-1);
  const next = () => shiftDate(1);
  const today = () => setDate(new Date());
  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d);
  }

  return (
    <AppShell
      title="Schedule"
      subtitle={`${date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · ${CHAIRS.length} chairs · Day view`}
      actions={
        <>
          <div className="flex items-center gap-1">
            <button onClick={prev} className="rounded-full border border-border p-2 hover:bg-muted" aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></button>
            <GhostButton onClick={today}>Today</GhostButton>
            <button onClick={next} className="rounded-full border border-border p-2 hover:bg-muted" aria-label="Next day"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <PrimaryButton icon={Plus} onClick={() => openNew()}>New appointment</PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="!p-0 overflow-hidden">
          {error && (
            <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">{error}</div>
          )}
          <div className="overflow-x-auto">
            <div className="relative min-w-[640px]">
              <div className="grid" style={{ gridTemplateColumns: `72px repeat(${CHAIRS.length}, minmax(140px, 1fr))` }}>
                <div />
                {CHAIRS.map((c) => (
                  <div key={c} className="border-l border-border bg-muted/40 px-3 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Circle className="h-2 w-2 fill-primary text-primary" /> Chair {c}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{CHAIR_MEANING[c]}</div>
                  </div>
                ))}

                {hours.map((h) => (
                  <div key={h} className="contents">
                    <div className="border-t border-border px-2 py-1 text-right text-[11px] font-medium text-muted-foreground" style={{ height: hourH }}>
                      {h}:00
                    </div>
                    {CHAIRS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => openNew(c, h)}
                        className="relative border-l border-t border-border transition hover:bg-primary-soft/40"
                        style={{ height: hourH }}
                        aria-label={`New at ${h}:00 chair ${c}`}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border/60" />
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* appointments layer */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: hours.length * hourH }}>
                <div className="grid h-full" style={{ gridTemplateColumns: `72px repeat(${CHAIRS.length}, minmax(140px, 1fr))` }}>
                  <div />
                  {CHAIRS.map((c) => (
                    <div key={c} className="relative">
                      {items
                        .filter((a) => a.chair === c)
                        .map((a) => {
                          const d = new Date(a.start_at);
                          const startMins = d.getHours() * 60 + d.getMinutes();
                          const top = ((startMins - 8 * 60) / 60) * hourH;
                          const height = (a.duration_min / 60) * hourH;
                          if (top < 0 || top > hours.length * hourH) return null;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => openEdit(a)}
                              className={
                                "pointer-events-auto absolute left-1 right-1 rounded-xl px-2 py-1.5 text-left text-[11px] transition hover:brightness-95 " +
                                STATUS_TONE[a.status]
                              }
                              style={{ top, height: Math.max(height - 3, 20) }}
                              title={`${a.patient_name} — ${a.procedure}`}
                            >
                              <div className="truncate font-semibold">
                                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} · {a.patient_name}
                              </div>
                              <div className="truncate opacity-80">{a.procedure}</div>
                              <div className="mt-0.5 truncate text-[10px] opacity-70">{a.provider}</div>
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {loading && items.length === 0 && (
            <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">Loading…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
              No appointments for this day — click any empty slot to book.
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="Legend" />
            <ul className="space-y-2 text-sm">
              {APPOINTMENT_STATUSES.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={"h-3 w-6 rounded-md " + STATUS_TONE[s]} />
                  <span>{STATUS_LABEL[s]}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Day summary" />
            <ul className="space-y-2 text-sm">
              <SummaryRow label="Booked" value={items.length} />
              <SummaryRow label="Arrived" value={items.filter((a) => a.status === "arrived" || a.status === "in-chair" || a.status === "completed").length} />
              <SummaryRow label="Unconfirmed" value={items.filter((a) => a.status === "unconfirmed").length} />
              <SummaryRow label="Cancelled" value={items.filter((a) => a.status === "cancelled" || a.status === "no-show").length} />
            </ul>
          </Card>
        </div>
      </div>

      <AppointmentFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={submit}
        onDelete={editing ? remove : undefined}
        initial={editing}
        defaultStart={defaultStart}
        defaultChair={defaultChair}
      />
    </AppShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </li>
  );
}
