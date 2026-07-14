import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { listPatients, type PatientRow } from "@/lib/patients-api";
import {
  APPOINTMENT_STATUSES,
  STATUS_LABEL,
  type AppointmentInsert,
  type AppointmentRow,
  type AppointmentStatus,
} from "@/lib/appointments-api";

type Prefill = {
  patient_id?: string;
  procedure?: string;
  provider?: string;
  duration_min?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: AppointmentInsert) => Promise<void>;
  onDelete?: () => Promise<void>;
  initial?: AppointmentRow | null;
  defaultStart?: Date;
  defaultChair?: number;
  prefill?: Prefill;
};

const DURATIONS = [15, 30, 45, 60, 75, 90, 120];
const CHAIRS = [1, 2, 3, 4];

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentFormDialog({
  open,
  onClose,
  onSubmit,
  onDelete,
  initial,
  defaultStart,
  defaultChair,
}: Props) {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patient_id, setPatientId] = useState("");
  const [chair, setChair] = useState<number>(1);
  const [provider, setProvider] = useState("");
  const [procedure, setProcedure] = useState("");
  const [start_at, setStartAt] = useState("");
  const [duration_min, setDuration] = useState<number>(30);
  const [status, setStatus] = useState<AppointmentStatus>("confirmed");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    listPatients()
      .then(setPatients)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load patients"));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setPatientId(initial.patient_id);
      setChair(initial.chair);
      setProvider(initial.provider);
      setProcedure(initial.procedure);
      setStartAt(toLocalInput(new Date(initial.start_at)));
      setDuration(initial.duration_min);
      setStatus(initial.status);
      setNotes(initial.notes ?? "");
    } else {
      setPatientId("");
      setChair(defaultChair ?? 1);
      setProvider("");
      setProcedure("");
      setStartAt(toLocalInput(defaultStart ?? nextHalfHour()));
      setDuration(30);
      setStatus("confirmed");
      setNotes("");
    }
  }, [open, initial, defaultStart, defaultChair]);

  const patientOptions = useMemo(
    () =>
      patients.map((p) => ({
        id: p.id,
        label: `${p.full_name} · ${p.chart_no}`,
      })),
    [patients],
  );

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!patient_id) throw new Error("Choose a patient");
      const payload: AppointmentInsert = {
        patient_id,
        chair,
        provider,
        procedure,
        start_at: new Date(start_at).toISOString(),
        duration_min,
        status,
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

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("Delete this appointment?")) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">{initial ? "Edit appointment" : "New appointment"}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Patient *">
                <select required value={patient_id} onChange={(e) => setPatientId(e.target.value)} className={inputCls}>
                  <option value="">— select a patient —</option>
                  {patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Start *">
              <input type="datetime-local" required value={start_at} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Duration">
              <select value={duration_min} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </Field>
            <Field label="Chair *">
              <select required value={chair} onChange={(e) => setChair(Number(e.target.value))} className={inputCls}>
                {CHAIRS.map((c) => (
                  <option key={c} value={c}>Chair {c}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)} className={inputCls}>
                {APPOINTMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Provider *">
              <input required value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls} placeholder="Dr. Rina Okafor" />
            </Field>
            <Field label="Procedure *">
              <input required value={procedure} onChange={(e) => setProcedure(e.target.value)} className={inputCls} placeholder="Cleaning + Exam" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + " min-h-[70px]"} />
              </Field>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-2">
            <div>
              {initial && onDelete && (
                <button type="button" onClick={handleDelete} disabled={busy} className="rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60">
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {busy ? "Saving…" : initial ? "Save changes" : "Create appointment"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function nextHalfHour(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (d.getMinutes() === 0) d.setHours(d.getHours() + 1);
  return d;
}

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
