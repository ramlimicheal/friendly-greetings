import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import {
  CLAIM_STATUSES,
  type ClaimInsert,
  type ClaimItemInsert,
  type ClaimRow,
  type ClaimItemRow,
  type InsurancePlanRow,
} from "@/lib/billing-api";
import type { PatientRow } from "@/lib/patients-api";

type ItemDraft = {
  procedure_code: string;
  description: string;
  tooth_number: number | null;
  surfaces: string | null;
  service_date: string | null;
  fee: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  patients: PatientRow[];
  plans: InsurancePlanRow[];
  initial?: (ClaimRow & { items?: ClaimItemRow[] }) | null;
  defaultPatientId?: string | null;
  onSubmit: (c: ClaimInsert, items: Omit<ClaimItemInsert, "claim_id">[]) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const emptyItem = (d: string): ItemDraft => ({
  procedure_code: "D0000",
  description: "",
  tooth_number: null,
  surfaces: null,
  service_date: d,
  fee: 0,
});

export function ClaimFormDialog({ open, onClose, patients, plans, initial, defaultPatientId, onSubmit, onDelete }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patient_id, setPatient] = useState("");
  const [plan_id, setPlan] = useState<string>("");
  const [service_date, setDate] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [diagnosis, setDiag] = useState("");
  const [narrative, setNar] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    if (initial) {
      setPatient(initial.patient_id);
      setPlan(initial.plan_id ?? "");
      setDate(initial.service_date);
      setProvider(initial.provider ?? "");
      setStatus(initial.status);
      setDiag(initial.diagnosis ?? "");
      setNar(initial.narrative ?? "");
      setItems((initial.items ?? []).map((it) => ({
        procedure_code: it.procedure_code,
        description: it.description,
        tooth_number: it.tooth_number,
        surfaces: it.surfaces,
        service_date: it.service_date,
        fee: Number(it.fee),
      })));
    } else {
      setPatient(defaultPatientId ?? "");
      setPlan("");
      setDate(today);
      setProvider("");
      setStatus("draft");
      setDiag("");
      setNar("");
      setItems([emptyItem(today)]);
    }
  }, [open, initial, defaultPatientId]);

  const total = items.reduce((s, it) => s + Number(it.fee || 0), 0);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient_id) { setError("Choose a patient"); return; }
    if (!plan_id) { setError("Choose an insurance plan"); return; }
    if (!items.length) { setError("Add at least one procedure"); return; }
    setBusy(true); setError(null);
    try {
      const payload: ClaimInsert = {
        patient_id,
        plan_id,
        service_date,
        provider: provider || null,
        status,
        diagnosis: diagnosis || null,
        narrative: narrative || null,
        claim_no: "",
      };
      const itemRows = items.map((it) => ({
        procedure_code: it.procedure_code,
        description: it.description || it.procedure_code,
        tooth_number: it.tooth_number,
        surfaces: it.surfaces,
        service_date: it.service_date,
        fee: it.fee,
      }));
      await onSubmit(payload, itemRows);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">{initial ? `Edit ${initial.claim_no}` : "New insurance claim"}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Patient *">
              <select required value={patient_id} onChange={(e) => setPatient(e.target.value)} className={inputCls} disabled={!!initial}>
                <option value="">Select…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name} · {p.chart_no}</option>)}
              </select>
            </Field>
            <Field label="Insurance plan *">
              <select required value={plan_id} onChange={(e) => setPlan(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.payer_name}{p.plan_name ? ` · ${p.plan_name}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Service date"><input type="date" value={service_date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Provider (dentist)"><input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Dr. Smith" className={inputCls} /></Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                {CLAIM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Diagnosis code"><input value={diagnosis} onChange={(e) => setDiag(e.target.value)} placeholder="K02.9" className={inputCls} /></Field>
          </div>

          <div className="rounded-2xl border border-border">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="text-xs font-medium uppercase text-muted-foreground">Procedures</div>
              <button type="button" onClick={() => setItems([...items, emptyItem(service_date)])} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs hover:bg-muted"><Plus className="h-3 w-3" /> Add</button>
            </div>
            <div className="divide-y divide-border">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                  <input placeholder="D0120" value={it.procedure_code} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, procedure_code: e.target.value.toUpperCase() } : x))} className={inputCls + " col-span-2"} />
                  <input placeholder="Description" value={it.description} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} className={inputCls + " col-span-4"} />
                  <input placeholder="Tooth" type="number" value={it.tooth_number ?? ""} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, tooth_number: e.target.value ? Number(e.target.value) : null } : x))} className={inputCls + " col-span-1"} />
                  <input placeholder="Surf." value={it.surfaces ?? ""} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, surfaces: e.target.value || null } : x))} className={inputCls + " col-span-1"} />
                  <input type="date" value={it.service_date ?? ""} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, service_date: e.target.value || null } : x))} className={inputCls + " col-span-2"} />
                  <input placeholder="Fee" type="number" step="0.01" value={it.fee} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, fee: Number(e.target.value) } : x))} className={inputCls + " col-span-1 text-right"} />
                  <button type="button" onClick={() => setItems(items.filter((_, x) => x !== i))} className="col-span-1 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="border-t border-border bg-muted/40 px-3 py-2 text-right text-sm">
              <span className="text-xs uppercase text-muted-foreground mr-2">Billed total</span>
              <span className="text-base font-semibold">${total.toFixed(2)}</span>
            </div>
          </div>

          <Field label="Narrative / remarks"><textarea value={narrative} onChange={(e) => setNar(e.target.value)} className={inputCls + " min-h-[60px]"} /></Field>

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {initial && onDelete && (
                <button type="button" onClick={async () => { if (confirm("Delete claim?")) { setBusy(true); try { await onDelete(); onClose(); } finally { setBusy(false); } } }} disabled={busy} className="rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60">Delete</button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy ? "Saving…" : initial ? "Save" : "Create claim"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
