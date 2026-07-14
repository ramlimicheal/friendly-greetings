import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CheckCircle2, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import {
  addItem, createPlan, deleteItem, deletePlan, listFees, listItems, listPlansForPatient,
  planTotals, updateItem, updatePlan, ITEM_STATUSES, PLAN_STATUSES,
  type FeeRow, type TreatmentPlanItemRow, type TreatmentPlanRow,
} from "@/lib/treatment-plans-api";
import { PlanExplainerDialog } from "@/components/plan-explainer-dialog";


export function TreatmentPlanPanel({ patientId, patientName }: { patientId: string; patientName?: string }) {
  const [plans, setPlans] = useState<TreatmentPlanRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([listPlansForPatient(patientId), listFees()]);
      setPlans(p); setFees(f);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId]);

  const onNewPlan = async () => {
    try {
      const p = await createPlan({ patient_id: patientId, title: `Plan ${new Date().toLocaleDateString()}` });
      setPlans((xs) => [p, ...xs]);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Treatment plans</div>
          <div className="text-xs text-muted-foreground">Group procedures into phases and track acceptance & completion.</div>
        </div>
        <button onClick={onNewPlan} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> New plan
        </button>
      </div>

      {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">{err}</div>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl bg-muted/40 p-8 text-center">
          <div className="text-sm font-medium">No treatment plans yet</div>
          <p className="mt-1 text-xs text-muted-foreground">Click "New plan" to start building one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} fees={fees} patientName={patientName ?? "the patient"} onChange={load} onDelete={async () => { await deletePlan(p.id); await load(); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, fees, patientName, onChange, onDelete }: { plan: TreatmentPlanRow; fees: FeeRow[]; patientName: string; onChange: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<TreatmentPlanItemRow[]>([]);
  const [title, setTitle] = useState(plan.title);
  const [status, setStatus] = useState(plan.status);
  const [explainOpen, setExplainOpen] = useState(false);
  useEffect(() => { listItems(plan.id).then(setItems).catch(() => {}); }, [plan.id]);


  const totals = useMemo(() => planTotals(items), [items]);
  const grouped = useMemo(() => {
    const g: Record<number, TreatmentPlanItemRow[]> = {};
    for (const it of items) { (g[it.phase] ??= []).push(it); }
    return Object.entries(g).sort(([a],[b]) => Number(a) - Number(b));
  }, [items]);

  const savePlanField = async (patch: Partial<TreatmentPlanRow>) => {
    await updatePlan(plan.id, patch as any);
  };

  const addNew = async (phase: number) => {
    const first = fees[0];
    const row = await addItem({
      plan_id: plan.id, phase,
      procedure_code: first?.code ?? "D0000",
      description: first?.description ?? "New procedure",
      fee: Number(first?.default_fee ?? 0),
      status: "planned",
    });
    setItems((xs) => [...xs, row]);
  };

  const patchItem = async (id: string, patch: Partial<TreatmentPlanItemRow>) => {
    const updated = await updateItem(id, patch as any);
    setItems((xs) => xs.map((it) => (it.id === id ? updated : it)));
  };
  const removeItem = async (id: string) => {
    await deleteItem(id);
    setItems((xs) => xs.filter((it) => it.id !== id));
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-left">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => { if (title !== plan.title) savePlanField({ title }); }}
            className="rounded-md bg-transparent px-1 text-sm font-semibold outline-none hover:bg-muted focus:bg-muted"
          />
        </button>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); savePlanField({ status: e.target.value }); }}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium capitalize"
          >
            {PLAN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">${totals.total.toFixed(0)}</span> total
            {" · "}<span className="text-emerald-700">${totals.completed.toFixed(0)}</span> done
            {" · "}${totals.planned.toFixed(0)} planned
          </div>
          <button onClick={() => setExplainOpen(true)} disabled={items.length === 0}
            title="AI plain-language summary for patient"
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
            <Sparkles className="h-3 w-3" /> Explain
          </button>
          <button onClick={onDelete} className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" title="Delete plan">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <PlanExplainerDialog
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        patientName={patientName}
        items={items.map((it) => ({
          procedure_code: it.procedure_code,
          description: it.description,
          fee: Number(it.fee),
          tooth_number: it.tooth_number,
          surfaces: it.surfaces,
        }))}
      />


      {open && (
        <div className="border-t border-border">
          {grouped.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">No procedures yet.</div>
          )}
          {grouped.map(([phase, rows]) => (
            <PhaseBlock
              key={phase}
              phase={Number(phase)}
              rows={rows}
              fees={fees}
              onAdd={() => addNew(Number(phase))}
              onPatch={patchItem}
              onRemove={removeItem}
            />
          ))}
          <div className="flex items-center justify-between border-t border-border p-3">
            <button
              onClick={() => addNew((grouped.length > 0 ? Math.max(...grouped.map(([p]) => Number(p))) + 1 : 1))}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" /> Add phase
            </button>
            {plan.status !== "accepted" && (
              <button onClick={() => savePlanField({ status: "accepted", accepted_at: new Date().toISOString().slice(0,10) })}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark accepted
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseBlock({ phase, rows, fees, onAdd, onPatch, onRemove }: {
  phase: number; rows: TreatmentPlanItemRow[]; fees: FeeRow[];
  onAdd: () => void;
  onPatch: (id: string, patch: Partial<TreatmentPlanItemRow>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between bg-muted/30 px-3 py-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phase {phase}</div>
        <button onClick={onAdd} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
          <Plus className="h-3 w-3" /> Add procedure
        </button>
      </div>
      <div className="divide-y divide-border">
        {rows.map((it) => (
          <ItemRow key={it.id} item={it} fees={fees} onPatch={onPatch} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function ItemRow({ item, fees, onPatch, onRemove }: {
  item: TreatmentPlanItemRow; fees: FeeRow[];
  onPatch: (id: string, patch: Partial<TreatmentPlanItemRow>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [local, setLocal] = useState(item);
  useEffect(() => setLocal(item), [item]);

  const commitFee = () => { if (Number(local.fee) !== Number(item.fee)) onPatch(item.id, { fee: Number(local.fee) }); };
  const commitTooth = () => { const n = local.tooth_number ?? null; if (n !== item.tooth_number) onPatch(item.id, { tooth_number: n }); };
  const commitSurfaces = () => { if ((local.surfaces ?? "") !== (item.surfaces ?? "")) onPatch(item.id, { surfaces: local.surfaces || null }); };

  const pickCode = (code: string) => {
    const f = fees.find((x) => x.code === code);
    if (f) onPatch(item.id, { procedure_code: f.code, description: f.description, fee: Number(f.default_fee) });
  };

  return (
    <div className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm">
      <select value={local.procedure_code} onChange={(e) => pickCode(e.target.value)}
        className="col-span-3 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono">
        {fees.map((f) => <option key={f.code} value={f.code}>{f.code}</option>)}
      </select>
      <input value={local.description} onChange={(e) => setLocal({ ...local, description: e.target.value })}
        onBlur={() => { if (local.description !== item.description) onPatch(item.id, { description: local.description }); }}
        className="col-span-4 rounded-md border border-border bg-background px-2 py-1" />
      <input type="number" placeholder="#" value={local.tooth_number ?? ""}
        onChange={(e) => setLocal({ ...local, tooth_number: e.target.value ? Number(e.target.value) : null })}
        onBlur={commitTooth}
        className="col-span-1 rounded-md border border-border bg-background px-2 py-1 text-xs" />
      <input placeholder="MOD" value={local.surfaces ?? ""} onChange={(e) => setLocal({ ...local, surfaces: e.target.value })}
        onBlur={commitSurfaces}
        className="col-span-1 rounded-md border border-border bg-background px-2 py-1 text-xs uppercase" />
      <input type="number" step="0.01" value={String(local.fee)}
        onChange={(e) => setLocal({ ...local, fee: e.target.value as any })}
        onBlur={commitFee}
        className="col-span-1 rounded-md border border-border bg-background px-2 py-1 text-right text-xs" />
      <select value={local.status} onChange={(e) => onPatch(item.id, { status: e.target.value, completed_at: e.target.value === "completed" ? new Date().toISOString().slice(0,10) : null })}
        className="col-span-1 rounded-full border border-border bg-background px-2 py-1 text-xs capitalize">
        {ITEM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <button onClick={() => onRemove(item.id)} className="col-span-1 justify-self-end rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
