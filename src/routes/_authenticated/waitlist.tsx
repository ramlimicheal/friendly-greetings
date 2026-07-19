import { createFileRoute } from "@tanstack/react-router";
import { useRequirePermission } from "@/hooks/use-permissions";
import { useEffect, useState } from "react";
import { Plus, Calendar, Trash2, Pencil } from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, SectionHeader } from "@/components/app-shell";
import { WaitlistFormDialog } from "@/components/waitlist-form-dialog";
import { AppointmentFormDialog } from "@/components/appointment-form-dialog";
import { createAppointment, type AppointmentInsert } from "@/lib/appointments-api";
import {
  listWaitlist,
  createWaitlist,
  updateWaitlist,
  deleteWaitlist,
  markWaitlistScheduled,
  type WaitlistInsert,
  type WaitlistWithPatient,
} from "@/lib/waitlist-api";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/waitlist")({
  head: () => ({
    meta: [
      { title: "Waitlist — Enamel Dental Clinic" },
      { name: "description", content: "Patients waiting for a slot — auto-fill when appointments cancel." },
    ],
  }),
  component: WaitlistPage,
});

const PRIORITY_TONE: Record<number, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-primary-soft text-accent-foreground",
  3: "bg-primary/10 text-primary",
  4: "bg-amber-100 text-amber-800",
  5: "bg-red-100 text-red-700 ring-1 ring-red-200",
};

function WaitlistPage() {
  useRequirePermission(["waitlist.manage","schedule.view"] as const);
  const [items, setItems] = useState<WaitlistWithPatient[]>([]);
  const [filter, setFilter] = useState<"active" | "scheduled" | "removed" | "all">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; editing: WaitlistWithPatient | null }>({ open: false, editing: null });
  const [bookFrom, setBookFrom] = useState<WaitlistWithPatient | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listWaitlist(filter));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  useEffect(() => {
    const ch = supabase.channel("waitlist-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [filter]);

  const save = async (values: WaitlistInsert) => {
    if (dialog.editing) await updateWaitlist(dialog.editing.id, values);
    else await createWaitlist(values);
    await load();
  };

  const remove = async () => {
    if (!dialog.editing) return;
    await deleteWaitlist(dialog.editing.id);
    await load();
  };

  const bookAppt = async (values: AppointmentInsert) => {
    await createAppointment(values);
    if (bookFrom) await markWaitlistScheduled(bookFrom.id);
    await load();
  };

  return (
    <AppShell
      title="Waitlist"
      subtitle={`${items.length} ${filter === "all" ? "" : filter} entries`}
      actions={
        <>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {(["active", "scheduled", "removed", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={"rounded-full px-3 py-1 text-xs font-medium capitalize transition " + (filter === f ? "bg-background shadow-sm" : "text-muted-foreground")}>
                {f}
              </button>
            ))}
          </div>
          <PrimaryButton icon={Plus} onClick={() => setDialog({ open: true, editing: null })}>Add patient</PrimaryButton>
        </>
      }
    >
      {error && (<div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>)}
      <Card className="!p-0 overflow-hidden">
        <SectionHeader title="Waiting patients" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Priority</th>
                <th className="px-4 py-2 text-left">Patient</th>
                <th className="px-4 py-2 text-left">Procedure</th>
                <th className="px-4 py-2 text-left">Duration</th>
                <th className="px-4 py-2 text-left">Preferred</th>
                <th className="px-4 py-2 text-left">Added</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (<tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>)}
              {!loading && items.length === 0 && (<tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-muted-foreground">No {filter} waitlist entries.</td></tr>)}
              {items.map((w) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="px-4 py-3"><span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + PRIORITY_TONE[w.priority]}>P{w.priority}</span></td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{w.patient_name}</div>
                    <div className="text-xs text-muted-foreground">{w.chart_no}</div>
                  </td>
                  <td className="px-4 py-3">{w.procedure}</td>
                  <td className="px-4 py-3 text-muted-foreground">{w.duration_min} min</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {w.preferred_provider || "Any provider"}{w.preferred_chair ? ` · Chair ${w.preferred_chair}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {w.status === "active" && (
                        <GhostButton icon={Calendar} onClick={() => setBookFrom(w)}>Book</GhostButton>
                      )}
                      <button onClick={() => setDialog({ open: true, editing: w })} className="rounded-full border border-border p-2 hover:bg-muted" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={async () => { if (confirm("Remove?")) { await deleteWaitlist(w.id); load(); } }} className="rounded-full border border-border p-2 hover:bg-muted" aria-label="Delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <WaitlistFormDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, editing: null })}
        onSubmit={save}
        onDelete={dialog.editing ? remove : undefined}
        initial={dialog.editing}
      />

      <AppointmentFormDialog
        open={!!bookFrom}
        onClose={() => setBookFrom(null)}
        onSubmit={bookAppt}
        defaultChair={bookFrom?.preferred_chair ?? undefined}
        prefill={bookFrom ? {
          patient_id: bookFrom.patient_id,
          procedure: bookFrom.procedure,
          provider: bookFrom.preferred_provider ?? "",
          duration_min: bookFrom.duration_min,
        } : undefined}
      />
    </AppShell>
  );
}
