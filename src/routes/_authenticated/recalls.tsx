import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { AppShell, Card, GhostButton, SectionHeader } from "@/components/app-shell";
import { listRecalls, completeRecall, deleteRecall, type RecallWithPatient } from "@/lib/recalls-api";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recalls")({
  head: () => ({
    meta: [
      { title: "Recalls — Enamel Dental Clinic" },
      { name: "description", content: "Recurring recall appointments — see who is due for cleanings and follow-ups." },
    ],
  }),
  component: RecallsPage,
});

function RecallsPage() {
  const [items, setItems] = useState<RecallWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"due" | "upcoming" | "all">("due");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listRecalls({ activeOnly: filter !== "all" });
      const now = new Date();
      const filtered = filter === "due"
        ? rows.filter((r) => new Date(r.next_due_at) <= now)
        : filter === "upcoming"
        ? rows.filter((r) => new Date(r.next_due_at) > now)
        : rows;
      setItems(filtered);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  useEffect(() => {
    const ch = supabase.channel("recalls-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "recalls" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [filter]);

  const complete = async (r: RecallWithPatient) => {
    await completeRecall(r.id, r.interval_months);
    await load();
  };

  const dueCount = items.filter((r) => new Date(r.next_due_at) <= new Date()).length;

  return (
    <AppShell
      title="Recalls"
      subtitle={`${dueCount} due · ${items.length} total ${filter}`}
      actions={
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(["due", "upcoming", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={"rounded-full px-3 py-1 text-xs font-medium capitalize transition " + (filter === f ? "bg-background shadow-sm" : "text-muted-foreground")}>
              {f}
            </button>
          ))}
        </div>
      }
    >
      {error && (<div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>)}
      <Card className="!p-0 overflow-hidden">
        <SectionHeader title={filter === "due" ? "Overdue recalls" : filter === "upcoming" ? "Upcoming recalls" : "All recalls"} description="Set up individual recalls from the patient chart." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Patient</th>
                <th className="px-4 py-2 text-left">Procedure</th>
                <th className="px-4 py-2 text-left">Interval</th>
                <th className="px-4 py-2 text-left">Last done</th>
                <th className="px-4 py-2 text-left">Next due</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (<tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>)}
              {!loading && items.length === 0 && (<tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">No recalls to show.</td></tr>)}
              {items.map((r) => {
                const overdue = new Date(r.next_due_at) <= new Date();
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Link to="/patients/$id" params={{ id: r.patient_id }} className="font-medium hover:underline">{r.patient_name}</Link>
                      <div className="text-xs text-muted-foreground">{r.chart_no}</div>
                    </td>
                    <td className="px-4 py-3">{r.procedure}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.interval_months} mo</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.last_completed_at ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={overdue ? "font-semibold text-red-700" : "text-muted-foreground"}>{r.next_due_at}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <GhostButton icon={CheckCircle2} onClick={() => complete(r)}>Mark done</GhostButton>
                        <button onClick={async () => { if (confirm("Delete recall?")) { await deleteRecall(r.id); load(); } }} className="rounded-full border border-border p-2 hover:bg-muted" aria-label="Delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
