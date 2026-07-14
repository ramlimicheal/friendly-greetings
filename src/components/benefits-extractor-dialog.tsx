import { useState } from "react";
import { X, Sparkles, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { extractBenefits, type BenefitBreakdown } from "@/lib/ai.functions";
import { createInsurancePlan } from "@/lib/billing-api";

export function BenefitsExtractorDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<BenefitBreakdown | null>(null);
  const [saved, setSaved] = useState(false);
  const fn = useServerFn(extractBenefits);

  if (!open) return null;

  const run = async () => {
    setBusy(true); setErr(null); setResult(null); setSaved(false);
    try { setResult(await fn({ data: { text } })); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to extract"); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!result) return;
    setBusy(true); setErr(null);
    try {
      await createInsurancePlan({
        payer_name: result.payer_name || "Unknown payer",
        plan_name: result.plan_name || null,
        annual_maximum: result.annual_maximum,
        deductible: result.deductible,
        preventive_pct: result.preventive_pct,
        basic_pct: result.basic_pct,
        major_pct: result.major_pct,
        ortho_pct: result.ortho_pct,
        notes: result.notes || null,
        active: true,
      });
      setSaved(true);
      onSaved?.();
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const update = (patch: Partial<BenefitBreakdown>) => setResult((r) => (r ? { ...r, ...patch } : r));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-card p-6 ring-1 ring-border">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white"><Sparkles className="h-4 w-4" /></span>
            <div>
              <h3 className="text-base font-semibold">AI benefits breakdown</h3>
              <p className="text-xs text-muted-foreground">Paste an insurance breakdown-of-benefits document — AI extracts coverage.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Paste breakdown of benefits text here… e.g. 'Delta Dental PPO. Annual max $1500. Deductible $50. Preventive 100%, Basic 80%, Major 50%, Ortho not covered. 12-mo waiting period on major. Missing tooth clause applies.'"
            rows={8}
            className="w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />

          <div className="flex justify-end">
            <button onClick={run} disabled={busy || text.trim().length < 20}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              <Sparkles className="h-3.5 w-3.5" /> {busy && !result ? "Extracting…" : "Extract benefits"}
            </button>
          </div>

          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">{err}</div>}

          {result && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Extracted — review and edit before saving
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Payer" value={result.payer_name} onChange={(v) => update({ payer_name: v })} />
                <Field label="Plan name" value={result.plan_name} onChange={(v) => update({ plan_name: v })} />
                <NumField label="Annual maximum ($)" value={result.annual_maximum} onChange={(v) => update({ annual_maximum: v })} />
                <NumField label="Deductible ($)" value={result.deductible} onChange={(v) => update({ deductible: v })} />
                <NumField label="Preventive %" value={result.preventive_pct} onChange={(v) => update({ preventive_pct: v })} />
                <NumField label="Basic %" value={result.basic_pct} onChange={(v) => update({ basic_pct: v })} />
                <NumField label="Major %" value={result.major_pct} onChange={(v) => update({ major_pct: v })} />
                <NumField label="Ortho %" value={result.ortho_pct} onChange={(v) => update({ ortho_pct: v })} />
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
                <textarea value={result.notes} onChange={(e) => update({ notes: e.target.value })} rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {saved ? (
                <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">✓ Saved as new insurance plan.</div>
              ) : (
                <div className="mt-3 flex justify-end">
                  <button onClick={save} disabled={busy} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {busy ? "Saving…" : "Save as insurance plan"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}
