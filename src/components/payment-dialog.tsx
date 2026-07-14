import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PAYMENT_METHODS, type PaymentInsert } from "@/lib/billing-api";
import type { PatientRow } from "@/lib/patients-api";

type Invoice = { id: string; invoice_no: string; patient_id: string; patient_portion: number | string; amount_paid: number | string };

type Props = {
  open: boolean;
  onClose: () => void;
  patients: PatientRow[];
  invoices: Invoice[];
  defaultInvoiceId?: string | null;
  onSubmit: (p: PaymentInsert) => Promise<void>;
};

export function PaymentDialog({ open, onClose, patients, invoices, defaultInvoiceId, onSubmit }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice_id, setInvoiceId] = useState<string>("");
  const [patient_id, setPatientId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>("card");
  const [reference, setReference] = useState<string>("");
  const [received_on, setDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDate(new Date().toISOString().slice(0, 10));
    setMethod("card");
    setReference("");
    setNotes("");
    if (defaultInvoiceId) {
      const inv = invoices.find((i) => i.id === defaultInvoiceId);
      setInvoiceId(defaultInvoiceId);
      setPatientId(inv?.patient_id ?? "");
      setAmount(inv ? Math.max(0, Number(inv.patient_portion) - Number(inv.amount_paid)) : 0);
    } else {
      setInvoiceId("");
      setPatientId("");
      setAmount(0);
    }
  }, [open, defaultInvoiceId, invoices]);

  if (!open) return null;

  const onInvoiceChange = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      setPatientId(inv.patient_id);
      setAmount(Math.max(0, Number(inv.patient_portion) - Number(inv.amount_paid)));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient_id) { setError("Choose a patient"); return; }
    if (!amount || amount <= 0) { setError("Enter an amount"); return; }
    setBusy(true); setError(null);
    try {
      await onSubmit({
        patient_id,
        invoice_id: invoice_id || null,
        amount,
        method,
        reference: reference || null,
        received_on,
        notes: notes || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Record payment</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <Field label="Apply to invoice">
            <select value={invoice_id} onChange={(e) => onInvoiceChange(e.target.value)} className={inputCls}>
              <option value="">— Unapplied payment —</option>
              {invoices.map((i) => {
                const bal = Number(i.patient_portion) - Number(i.amount_paid);
                return <option key={i.id} value={i.id}>{i.invoice_no} · bal ${bal.toFixed(2)}</option>;
              })}
            </select>
          </Field>
          <Field label="Patient *">
            <select required value={patient_id} onChange={(e) => setPatientId(e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name} · {p.chart_no}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount *"><input required type="number" step="0.01" min={0.01} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputCls} /></Field>
            <Field label="Method">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Received on"><input type="date" value={received_on} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Reference #"><input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + " min-h-[60px]"} /></Field>
          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy ? "Saving…" : "Record"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
