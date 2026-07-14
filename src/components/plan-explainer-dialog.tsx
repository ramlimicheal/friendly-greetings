import { useState } from "react";
import { X, Sparkles, Copy, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { explainTreatmentPlan, type PlanExplainerItem } from "@/lib/ai.functions";

export function PlanExplainerDialog({
  open,
  onClose,
  patientName,
  items,
}: {
  open: boolean;
  onClose: () => void;
  patientName: string;
  items: PlanExplainerItem[];
}) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const explainFn = useServerFn(explainTreatmentPlan);

  const run = async () => {
    setBusy(true); setErr(null); setText(null);
    try {
      const out = await explainFn({ data: { patient_name: patientName, items } });
      setText(out);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to generate"); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-card p-6 ring-1 ring-border">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white"><Sparkles className="h-4 w-4" /></span>
            <div>
              <h3 className="text-base font-semibold">Patient-friendly plan summary</h3>
              <p className="text-xs text-muted-foreground">Plain-language explanation for {patientName}.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {!text && !busy && !err && (
          <div className="rounded-2xl bg-muted/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">Generate a warm, plain-language summary of this treatment plan you can print or email to the patient.</p>
            <button onClick={run} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Sparkles className="h-4 w-4" /> Generate summary
            </button>
          </div>
        )}
        {busy && <div className="rounded-2xl bg-muted/40 p-8 text-center text-sm text-muted-foreground">Generating…</div>}
        {err && <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">{err}</div>}

        {text && (
          <>
            <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {text}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button onClick={run} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Regenerate</button>
              <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </button>
              <button onClick={() => { const w = window.open("", "_blank"); if (w) { w.document.write(`<pre style="font-family:system-ui;padding:2rem;white-space:pre-wrap;max-width:640px;margin:auto;line-height:1.6">${text.replace(/</g,"&lt;")}</pre>`); w.document.close(); w.print(); } }}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Print</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
