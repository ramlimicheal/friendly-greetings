import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { listPatients, type PatientRow } from "@/lib/patients-api";
import type { WaitlistInsert, WaitlistRow } from "@/lib/waitlist-api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: WaitlistInsert) => Promise<void>;
  onDelete?: () => Promise<void>;
  initial?: WaitlistRow | null;
  defaultPatientId?: string;
};

const DURATIONS = [15, 30, 45, 60, 75, 90, 120];

export function WaitlistFormDialog({ open, onClose, onSubmit, onDelete, initial, defaultPatientId }: Props) {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patient_id, setPatientId] = useState("");
  const [procedure, setProcedure] = useState("");
  const [preferred_provider, setProvider] = useState("");
  const [preferred_chair, setChair] = useState<number | "">("");
  const [duration_min, setDuration] = useState(30);
  const [priority, setPriority] = useState(3);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    listPatients().then(setPatients).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setPatientId(initial.patient_id);
      setProcedure(initial.procedure);
      setProvider(initial.preferred_provider ?? "");
      setChair(initial.preferred_chair ?? "");
      setDuration(initial.duration_min);
      setPriority(initial.priority);
      setNotes(initial.notes ?? "");
    } else {
      setPatientId(defaultPatientId ?? "");
      setProcedure("");
      setProvider("");
      setChair("");
      setDuration(30);
      setPriority(3);
      setNotes("");
    }
  }, [open, initial, defaultPatientId]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!patient_id) throw new Error("Choose a patient");
      const payload: WaitlistInsert = {
        patient_id,
        procedure,
        preferred_provider: preferred_provider || null,
        preferred_chair: preferred_chair === "" ? null : Number(preferred_chair),
        duration_min,
        priority,
        notes: notes || null,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!onDelete || !confirm("Remove from waitlist?")) return;
    setBusy(true);
    try { await onDelete(); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">{initial ? "Edit waitlist entry" : "Add to waitlist"}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Patient *">
                <select required value={patient_id} onChange={(e) => setPatientId(e.target.value)} className={inputCls}>
                  <option value="">— select a patient —</option>
                  {patients.map((p) => (<option key={p.id} value={p.id}>{p.full_name} · {p.chart_no}</option>))}
                </select>
              </Field>
            </div>
            <Field label="Procedure *">
              <input required value={procedure} onChange={(e) => setProcedure(e.target.value)} className={inputCls} placeholder="Cleaning + Exam" />
            </Field>
            <Field label="Duration">
              <select value={duration_min} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls}>
                {DURATIONS.map((d) => (<option key={d} value={d}>{d} min</option>))}
              </select>
            </Field>
            <Field label="Preferred provider">
              <input value={preferred_provider} onChange={(e) => setProvider(e.target.value)} className={inputCls} placeholder="Any" />
            </Field>
            <Field label="Preferred chair">
              <select value={preferred_chair} onChange={(e) => setChair(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls}>
                <option value="">Any</option>
                {[1, 2, 3, 4].map((c) => (<option key={c} value={c}>Chair {c}</option>))}
              </select>
            </Field>
            <Field label="Priority (1 low – 5 urgent)">
              <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className={inputCls}>
                {[1, 2, 3, 4, 5].map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + " min-h-[70px]"} />
              </Field>
            </div>
          </div>
          {error && (<div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>)}
          <div className="mt-6 flex items-center justify-between gap-2">
            <div>
              {initial && onDelete && (
                <button type="button" onClick={del} disabled={busy} className="rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60">Remove</button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy ? "Saving…" : initial ? "Save" : "Add to waitlist"}</button>
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
