import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { PatientInsert, PatientRow, PatientSex, PatientStatus } from "@/lib/patients-api";
import { PATIENT_STATUSES } from "@/lib/patients-api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PatientInsert) => Promise<void>;
  initial?: PatientRow | null;
  title?: string;
};

const SEX_OPTS: PatientSex[] = ["F", "M", "Other"];

export function PatientFormDialog({ open, onClose, onSubmit, initial, title }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [full_name, setFullName] = useState("");
  const [chart_no, setChartNo] = useState("");
  const [date_of_birth, setDob] = useState("");
  const [sex, setSex] = useState<PatientSex | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [insurance, setInsurance] = useState("");
  const [primary_dentist, setPrimaryDentist] = useState("");
  const [status, setStatus] = useState<PatientStatus>("New");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [allergiesInput, setAllergiesInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFullName(initial?.full_name ?? "");
    setChartNo(initial?.chart_no ?? "");
    setDob(initial?.date_of_birth ?? "");
    setSex((initial?.sex as PatientSex | null) ?? "");
    setPhone(initial?.phone ?? "");
    setEmail(initial?.email ?? "");
    setInsurance(initial?.insurance ?? "");
    setPrimaryDentist(initial?.primary_dentist ?? "");
    setStatus((initial?.status as PatientStatus) ?? "New");
    setAddress(initial?.address ?? "");
    setNotes(initial?.notes ?? "");
    setAllergiesInput((initial?.allergies ?? []).join(", "));
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const allergies = allergiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload: PatientInsert = {
        full_name,
        chart_no: chart_no || undefined,
        date_of_birth: date_of_birth || null,
        sex: (sex || null) as PatientSex | null,
        phone: phone || null,
        email: email || null,
        insurance: insurance || null,
        primary_dentist: primary_dentist || null,
        status,
        address: address || null,
        notes: notes || null,
        allergies,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">{title ?? (initial ? "Edit patient" : "New patient")}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name *">
              <input required value={full_name} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Chart # (auto if blank)">
              <input value={chart_no} onChange={(e) => setChartNo(e.target.value)} className={inputCls} placeholder="EN-1024" />
            </Field>
            <Field label="Date of birth">
              <input type="date" value={date_of_birth} onChange={(e) => setDob(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Sex">
              <select value={sex} onChange={(e) => setSex(e.target.value as PatientSex | "")} className={inputCls}>
                <option value="">—</option>
                {SEX_OPTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Insurance">
              <input value={insurance} onChange={(e) => setInsurance(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Primary dentist">
              <input value={primary_dentist} onChange={(e) => setPrimaryDentist(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as PatientStatus)} className={inputCls}>
                {PATIENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Allergies (comma-separated)">
              <input value={allergiesInput} onChange={(e) => setAllergiesInput(e.target.value)} className={inputCls} placeholder="Penicillin, Latex" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + " min-h-[80px]"} />
              </Field>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Saving…" : initial ? "Save changes" : "Create patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
