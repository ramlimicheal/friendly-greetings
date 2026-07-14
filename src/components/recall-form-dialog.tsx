import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { computeNextDue, type RecallInsert, type RecallRow } from "@/lib/recalls-api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: RecallInsert) => Promise<void>;
  onDelete?: () => Promise<void>;
  initial?: RecallRow | null;
  patient_id: string;
};

export function RecallFormDialog({ open, onClose, onSubmit, onDelete, initial, patient_id }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [procedure, setProcedure] = useState("Cleaning + exam");
  const [interval_months, setInterval] = useState(6);
  const [next_due_at, setDue] = useState("");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setProcedure(initial.procedure);
      setInterval(initial.interval_months);
      setDue(initial.next_due_at);
      setActive(initial.active);
      setNotes(initial.notes ?? "");
    } else {
      setProcedure("Cleaning + exam");
      setInterval(6);
      setDue(computeNextDue(new Date(), 6));
      setActive(true);
      setNotes("");
    }
  }, [open, initial]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ patient_id, procedure, interval_months, next_due_at, active, notes: notes || null });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!onDelete || !confirm("Delete this recall?")) return;
    setBusy(true);
    try { await onDelete(); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">{initial ? "Edit recall" : "New recall"}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <Field label="Procedure *">
            <input required value={procedure} onChange={(e) => setProcedure(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Every (months)">
              <input type="number" min={1} max={24} value={interval_months} onChange={(e) => {
                const m = Number(e.target.value);
                setInterval(m);
                if (!initial) setDue(computeNextDue(new Date(), m));
              }} className={inputCls} />
            </Field>
            <Field label="Next due">
              <input type="date" required value={next_due_at} onChange={(e) => setDue(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + " min-h-[70px]"} />
          </Field>
          {error && (<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>)}
          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {initial && onDelete && (
                <button type="button" onClick={del} disabled={busy} className="rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60">Delete</button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy ? "Saving…" : initial ? "Save" : "Create recall"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>);
}
