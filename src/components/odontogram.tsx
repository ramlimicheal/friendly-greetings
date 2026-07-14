import { useEffect, useMemo, useState } from "react";
import {
  loadLatestChart,
  upsertTooth,
  cycleSurface,
  surfaceColor,
  toothColor,
  SURFACE_CONDITIONS,
  TOOTH_CONDITIONS,
  PERMANENT_UPPER,
  PERMANENT_LOWER,
  PRIMARY_UPPER,
  PRIMARY_LOWER,
  type ToothChartRow,
  type SurfaceKey,
  type SurfaceCondition,
  type ToothCondition,
} from "@/lib/tooth-chart-api";

type Dentition = "permanent" | "primary";

export function Odontogram({ patientId }: { patientId: string }) {
  const [dentition, setDentition] = useState<Dentition>("permanent");
  const [charts, setCharts] = useState<Record<number, ToothChartRow>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingTooth, setSavingTooth] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadLatestChart(patientId)
      .then((m) => { if (!cancelled) setCharts(m); })
      .catch((e) => { if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load chart"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  const upper = dentition === "permanent" ? PERMANENT_UPPER : PRIMARY_UPPER;
  const lower = dentition === "permanent" ? PERMANENT_LOWER : PRIMARY_LOWER;

  const applyPatch = async (
    toothNumber: number,
    patch: Partial<Pick<ToothChartRow,
      | "surface_mesial" | "surface_distal" | "surface_buccal" | "surface_lingual" | "surface_occlusal"
      | "tooth_condition" | "notes"
    >>,
  ) => {
    setSavingTooth(toothNumber);
    try {
      const existing = charts[toothNumber];
      const row = await upsertTooth({
        patient_id: patientId,
        tooth_number: toothNumber,
        dentition,
        existing,
        patch,
      });
      setCharts((c) => ({ ...c, [toothNumber]: row }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingTooth(null);
    }
  };

  const selectedRow = selected != null ? charts[selected] : undefined;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-muted p-1 text-xs font-medium">
          {(["permanent", "primary"] as Dentition[]).map((d) => (
            <button
              key={d}
              onClick={() => { setDentition(d); setSelected(null); }}
              className={
                "rounded-full px-3 py-1.5 capitalize transition " +
                (dentition === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
              }
            >
              {d} dentition
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider">Surfaces:</span>
          {SURFACE_CONDITIONS.map((s) => (
            <span key={s.value} className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-border" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">{err}</div>}

      <div className="rounded-2xl bg-muted/40 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading chart…</p>
        ) : (
          <>
            <ArchRow
              teeth={upper}
              charts={charts}
              selected={selected}
              onSelect={setSelected}
              onSurfaceClick={(n, s) => applyPatch(n, { [`surface_${s}`]: cycleSurface((charts[n]?.[`surface_${s}` as const] ?? "sound") as SurfaceCondition) } as any)}
              savingTooth={savingTooth}
              label="Upper"
            />
            <div className="my-4 h-px bg-border" />
            <ArchRow
              teeth={lower}
              charts={charts}
              selected={selected}
              onSelect={setSelected}
              onSurfaceClick={(n, s) => applyPatch(n, { [`surface_${s}`]: cycleSurface((charts[n]?.[`surface_${s}` as const] ?? "sound") as SurfaceCondition) } as any)}
              savingTooth={savingTooth}
              label="Lower"
              flip
            />
          </>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Click any surface to cycle its condition. Select a tooth below to change whole-tooth status or add notes.
      </p>

      {selected != null && (
        <ToothDetailPanel
          key={selected}
          toothNumber={selected}
          row={selectedRow}
          saving={savingTooth === selected}
          onChange={(patch) => applyPatch(selected, patch)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ArchRow({
  teeth, charts, selected, onSelect, onSurfaceClick, savingTooth, label, flip,
}: {
  teeth: number[];
  charts: Record<number, ToothChartRow>;
  selected: number | null;
  onSelect: (n: number) => void;
  onSurfaceClick: (n: number, s: SurfaceKey) => void;
  savingTooth: number | null;
  label: string;
  flip?: boolean;
}) {
  return (
    <div>
      {!flip && <div className="mb-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${teeth.length}, minmax(0, 1fr))` }}>
        {teeth.map((n) => (
          <ToothCell
            key={n}
            num={n}
            row={charts[n]}
            selected={selected === n}
            saving={savingTooth === n}
            onSelect={() => onSelect(n)}
            onSurfaceClick={(s) => onSurfaceClick(n, s)}
          />
        ))}
      </div>
      {flip && <div className="mt-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>}
    </div>
  );
}

function ToothCell({
  num, row, selected, saving, onSelect, onSurfaceClick,
}: {
  num: number;
  row?: ToothChartRow;
  selected: boolean;
  saving: boolean;
  onSelect: () => void;
  onSurfaceClick: (s: SurfaceKey) => void;
}) {
  const cond = (row?.tooth_condition ?? "present") as ToothCondition;
  const outline = toothColor(cond);
  const surfaces: Record<SurfaceKey, string> = {
    mesial:   surfaceColor((row?.surface_mesial   ?? "sound") as SurfaceCondition),
    distal:   surfaceColor((row?.surface_distal   ?? "sound") as SurfaceCondition),
    buccal:   surfaceColor((row?.surface_buccal   ?? "sound") as SurfaceCondition),
    lingual:  surfaceColor((row?.surface_lingual  ?? "sound") as SurfaceCondition),
    occlusal: surfaceColor((row?.surface_occlusal ?? "sound") as SurfaceCondition),
  };
  const missing = cond === "missing";
  return (
    <div className={"flex flex-col items-center gap-1 rounded-md p-1 transition " + (selected ? "bg-primary/10 ring-1 ring-primary" : "")}>
      <button onClick={onSelect} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">
        {num}
      </button>
      <div className="relative">
        <svg
          viewBox="0 0 40 40"
          className={"h-11 w-11 " + (missing ? "opacity-40" : "")}
          style={{ filter: saving ? "opacity(0.6)" : undefined }}
        >
          {/* Frame */}
          <rect x="2" y="2" width="36" height="36" rx="6" fill={outline} stroke="#94a3b8" strokeWidth="1" />
          {/* Occlusal (center) */}
          <rect x="14" y="14" width="12" height="12" fill={surfaces.occlusal} stroke="#94a3b8" strokeWidth="0.5"
            style={{ cursor: "pointer" }} onClick={() => onSurfaceClick("occlusal")} />
          {/* Buccal (top) */}
          <polygon points="2,2 38,2 26,14 14,14" fill={surfaces.buccal} stroke="#94a3b8" strokeWidth="0.5"
            style={{ cursor: "pointer" }} onClick={() => onSurfaceClick("buccal")} />
          {/* Lingual (bottom) */}
          <polygon points="14,26 26,26 38,38 2,38" fill={surfaces.lingual} stroke="#94a3b8" strokeWidth="0.5"
            style={{ cursor: "pointer" }} onClick={() => onSurfaceClick("lingual")} />
          {/* Mesial (left) */}
          <polygon points="2,2 14,14 14,26 2,38" fill={surfaces.mesial} stroke="#94a3b8" strokeWidth="0.5"
            style={{ cursor: "pointer" }} onClick={() => onSurfaceClick("mesial")} />
          {/* Distal (right) */}
          <polygon points="38,2 38,38 26,26 26,14" fill={surfaces.distal} stroke="#94a3b8" strokeWidth="0.5"
            style={{ cursor: "pointer" }} onClick={() => onSurfaceClick("distal")} />
          {cond === "missing" && <line x1="4" y1="4" x2="36" y2="36" stroke="#dc2626" strokeWidth="2" />}
          {cond === "extract_planned" && <line x1="4" y1="36" x2="36" y2="4" stroke="#f97316" strokeWidth="2" />}
        </svg>
      </div>
    </div>
  );
}

function ToothDetailPanel({
  toothNumber, row, saving, onChange, onClose,
}: {
  toothNumber: number;
  row?: ToothChartRow;
  saving: boolean;
  onChange: (patch: Partial<Pick<ToothChartRow, "tooth_condition" | "notes">>) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(row?.notes ?? "");
  useEffect(() => { setNotes(row?.notes ?? ""); }, [row?.notes]);
  const cond = (row?.tooth_condition ?? "present") as ToothCondition;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Tooth {toothNumber}</div>
          <div className="text-[11px] text-muted-foreground">Last updated: {row?.updated_at ? new Date(row.updated_at).toLocaleString() : "never"}</div>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Whole-tooth status</div>
        <div className="flex flex-wrap gap-1.5">
          {TOOTH_CONDITIONS.map((t) => (
            <button
              key={t.value}
              disabled={saving}
              onClick={() => onChange({ tooth_condition: t.value })}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition " +
                (cond === t.value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground")
              }
            >
              <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-border" style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if ((row?.notes ?? "") !== notes) onChange({ notes: notes || null }); }}
          rows={2}
          placeholder="Clinical observations for this tooth…"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}
