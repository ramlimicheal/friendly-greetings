import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import {
  CATEGORIES,
  INVOICE_STATUSES,
  calcInvoiceTotals,
  coveragePct,
  estimate,
  type InsurancePlanRow,
  type InvoiceInsert,
  type InvoiceItemInsert,
  type InvoiceRow,
  type InvoiceItemRow,
} from "@/lib/billing-api";
import type { PatientRow } from "@/lib/patients-api";

type ItemDraft = {
  procedure_code: string;
  description: string;
  tooth_number: number | null;
  surfaces: string | null;
  category: string;
  fee: number;
  insurance_estimate: number;
  patient_portion: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  patients: PatientRow[];
  plans: InsurancePlanRow[];
  initial?: (InvoiceRow & { items?: InvoiceItemRow[] }) | null;
  defaultPatientId?: string | null;
  onSubmit: (inv: InvoiceInsert, items: Omit<InvoiceItemInsert, "invoice_id">[]) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const emptyItem = (): ItemDraft => ({
  procedure_code: "D0000",
  description: "",
  tooth_number: null,
  surfaces: null,
  category: "preventive",
  fee: 0,
  insurance_estimate: 0,
  patient_portion: 0,
});

export function InvoiceFormDialog({ open, onClose, patients, plans, initial, defaultPatientId, onSubmit, onDelete }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patient_id, setPatient] = useState("");
  const [plan_id, setPlan] = useState<string>("");
  const [issue_date, setIssue] = useState("");
  const [due_date, setDue] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    if (initial) {
      setPatient(initial.patient_id);
      setPlan("");
      setIssue(initial.issue_date);
      setDue(initial.due_date);
      setStatus(initial.status);
      setNotes(initial.notes ?? "");
      setItems(
        (initial.items ?? []).map((it) => ({
          procedure_code: it.procedure_code,
          description: it.description,
          tooth_number: it.tooth_number,
          surfaces: it.surfaces,
          category: it.category,
          fee: Number(it.fee),
          insurance_estimate: Number(it.insurance_estimate),
          patient_portion: Number(it.patient_portion),
        })),
      );
    } else {
      setPatient(defaultPatientId ?? "");
      setPlan("");
      setIssue(today);
      setDue(in30);
      setStatus("draft");
      setNotes("");
      setItems([emptyItem()]);
    }
  }, [open, initial, defaultPatientId]);

  const plan = plans.find((p) => p.id === plan_id) ?? null;
  const totals = calcInvoiceTotals(items);
  const est = plan ? estimate(plan, 0, items) : null;

  const applyEstimate = () => {
    if (!plan) return;
    setItems(items.map((it) => {
      const pct = coveragePct(plan, it.category);
      const ins = (Number(it.fee) * pct) / 100;
      return { ...it, insurance_estimate: ins, patient_portion: Math.max(0, Number(it.fee) - ins) };
    }));
  };

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient_id) { setError("Choose a patient"); return; }
    if (!items.length) { setError("Add at least one line item"); return; }
    setBusy(true); setError(null);
    try {
      const payload: InvoiceInsert = { patient_id, issue_date, due_date, status, notes: notes || null, invoice_no: "" };
      const itemRows = items.map((it) => ({
        procedure_code: it.procedure_code,
        description: it.description || it.procedure_code,
        tooth_number: it.tooth_number,
        surfaces: it.surfaces,
        category: it.category,
        fee: it.fee,
        insurance_estimate: it.insurance_estimate,
        patient_portion: it.patient_portion,
      }));
      await onSubmit(payload, itemRows);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const setItem = (i: number, patch: Partial<ItemDraft>) => {
    setItems(items.map((it, idx) => {
      if (idx !== i) return it;
      const merged = { ...it, ...patch };
      // auto-derive patient portion if fee/insurance changes
      if ("fee" in patch || "insurance_estimate" in patch) {
        merged.patient_portion = Math.max(0, Number(merged.fee) - Number(merged.insurance_estimate));
      }
      return merged;
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">{initial ? `Edit ${initial.invoice_no}` : "New invoice"}</h2>
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
            <Field label="Insurance plan (for estimate)">
              <div className="flex gap-2">
                <select value={plan_id} onChange={(e) => setPlan(e.target.value)} className={inputCls}>
                  <option value="">— None (self-pay) —</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.payer_name}{p.plan_name ? ` · ${p.plan_name}` : ""}</option>)}
                </select>
                <button type="button" onClick={applyEstimate} disabled={!plan} className="whitespace-nowrap rounded-lg border border-border bg-muted px-3 text-xs font-medium disabled:opacity-50">Estimate</button>
              </div>
            </Field>
            <Field label="Issue date"><input type="date" value={issue_date} onChange={(e) => setIssue(e.target.value)} className={inputCls} /></Field>
            <Field label="Due date"><input type="date" value={due_date} onChange={(e) => setDue(e.target.value)} className={inputCls} /></Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="rounded-2xl border border-border">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="text-xs font-medium text-muted-foreground uppercase">Line items</div>
              <button type="button" onClick={() => setItems([...items, emptyItem()])} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs hover:bg-muted"><Plus className="h-3 w-3" /> Add</button>
            </div>
            <div className="divide-y divide-border">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                  <input placeholder="D0120" value={it.procedure_code} onChange={(e) => setItem(i, { procedure_code: e.target.value.toUpperCase() })} className={inputCls + " col-span-2"} />
                  <input placeholder="Description" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} className={inputCls + " col-span-3"} />
                  <input placeholder="Tooth" type="number" value={it.tooth_number ?? ""} onChange={(e) => setItem(i, { tooth_number: e.target.value ? Number(e.target.value) : null })} className={inputCls + " col-span-1"} />
                  <select value={it.category} onChange={(e) => setItem(i, { category: e.target.value })} className={inputCls + " col-span-2"}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input placeholder="Fee" type="number" step="0.01" value={it.fee} onChange={(e) => setItem(i, { fee: Number(e.target.value) })} className={inputCls + " col-span-1 text-right"} />
                  <input placeholder="Ins" type="number" step="0.01" value={it.insurance_estimate} onChange={(e) => setItem(i, { insurance_estimate: Number(e.target.value) })} className={inputCls + " col-span-1 text-right"} />
                  <div className="col-span-1 flex items-center justify-end text-xs text-muted-foreground">${it.patient_portion.toFixed(2)}</div>
                  <button type="button" onClick={() => setItems(items.filter((_, x) => x !== i))} className="col-span-1 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3 border-t border-border bg-muted/40 px-3 py-3 text-sm">
              <Summary label="Subtotal" value={totals.subtotal} />
              <Summary label="Insurance est." value={totals.insurance} />
              <Summary label="Patient portion" value={totals.patient} strong />
              {est && <div className="text-xs text-muted-foreground self-end">Est. remaining benefit: ${est.remainingBenefit.toFixed(0)}</div>}
            </div>
          </div>

          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + " min-h-[60px]"} />
          </Field>

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {initial && onDelete && (
                <button type="button" onClick={async () => { if (confirm("Delete invoice?")) { setBusy(true); try { await onDelete(); onClose(); } finally { setBusy(false); } } }} disabled={busy} className="rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60">Delete</button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy ? "Saving…" : initial ? "Save" : "Create invoice"}</button>
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
function Summary({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={strong ? "text-lg font-semibold" : "text-base"}>${value.toFixed(2)}</div>
    </div>
  );
}
