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
  teeth, charts, selected, onSelect, onSurfaceClick, savingTooth, label, flip, dentition,
}: {
  teeth: number[];
  charts: Record<number, ToothChartRow>;
  selected: number | null;
  onSelect: (n: number) => void;
  onSurfaceClick: (n: number, s: SurfaceKey) => void;
  savingTooth: number | null;
  label: string;
  flip?: boolean;
  dentition: "permanent" | "primary";
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
            dentition={dentition}
          />
        ))}
      </div>
      {flip && <div className="mt-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>}
    </div>
  );
}

type ToothType = "incisor" | "canine" | "premolar" | "molar";
function toothType(num: number, dentition: "permanent" | "primary"): ToothType {
  const last = num % 10;
  if (dentition === "primary") {
    if (last <= 2) return "incisor";
    if (last === 3) return "canine";
    return "molar";
  }
  if (last <= 2) return "incisor";
  if (last === 3) return "canine";
  if (last <= 5) return "premolar";
  return "molar";
}

const TOOTH_SHAPES: Record<ToothType, string> = {
  molar:    "M8,10 Q8,4 14,4 L26,4 Q32,4 32,10 Q34,14 34,20 Q34,26 32,30 Q32,36 26,36 L14,36 Q8,36 8,30 Q6,26 6,20 Q6,14 8,10 Z",
  premolar: "M11,12 Q11,5 20,5 Q29,5 29,12 Q31,16 31,20 Q31,26 29,30 Q28,35 20,35 Q12,35 11,30 Q9,26 9,20 Q9,16 11,12 Z",
  canine:   "M20,3 Q26,4 29,12 Q32,18 31,24 Q30,32 26,35 Q20,38 14,35 Q10,32 9,24 Q8,18 11,12 Q14,4 20,3 Z",
  incisor:  "M13,5 Q20,3 27,5 Q30,14 30,22 Q30,30 27,34 Q20,37 13,34 Q10,30 10,22 Q10,14 13,5 Z",
};

function ToothCell({
  num, row, selected, saving, onSelect, onSurfaceClick, dentition,
}: {
  num: number;
  row?: ToothChartRow;
  selected: boolean;
  saving: boolean;
  onSelect: () => void;
  onSurfaceClick: (s: SurfaceKey) => void;
  dentition: "permanent" | "primary";
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
  const type = toothType(num, dentition);
  const shape = TOOTH_SHAPES[type];
  const clipId = `tc-${num}`;
  const centerEl = type === "incisor" || type === "canine"
    ? <ellipse cx="20" cy="20" rx="6" ry="10" fill={surfaces.occlusal} onClick={() => onSurfaceClick("occlusal")} style={{ cursor: "pointer" }} />
    : <ellipse cx="20" cy="20" rx="8" ry="8" fill={surfaces.occlusal} onClick={() => onSurfaceClick("occlusal")} style={{ cursor: "pointer" }} />;

  return (
    <div className={"flex flex-col items-center gap-1 rounded-md p-1 transition " + (selected ? "bg-primary/10 ring-1 ring-primary" : "")}>
      <button onClick={onSelect} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">
        {num}
      </button>
      <div className="relative">
        <svg
          viewBox="0 0 40 40"
          className={"h-12 w-11 drop-shadow-sm " + (missing ? "opacity-40" : "")}
          style={{ filter: saving ? "opacity(0.6)" : undefined }}
        >
          <defs>
            <clipPath id={clipId}>
              <path d={shape} />
            </clipPath>
            <radialGradient id={`sheen-${num}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path d={shape} fill={outline} />

          <g clipPath={`url(#${clipId})`}>
            <rect x="0" y="0" width="40" height="12" fill={surfaces.buccal}
              onClick={() => onSurfaceClick("buccal")} style={{ cursor: "pointer" }} />
            <rect x="0" y="28" width="40" height="12" fill={surfaces.lingual}
              onClick={() => onSurfaceClick("lingual")} style={{ cursor: "pointer" }} />
            <rect x="0" y="8" width="10" height="24" fill={surfaces.mesial}
              onClick={() => onSurfaceClick("mesial")} style={{ cursor: "pointer" }} />
            <rect x="30" y="8" width="10" height="24" fill={surfaces.distal}
              onClick={() => onSurfaceClick("distal")} style={{ cursor: "pointer" }} />
            {centerEl}

            <g pointerEvents="none" stroke="#64748b" strokeWidth="0.4" fill="none" opacity="0.55">
              {type === "molar" && (
                <>
                  <path d="M14,20 L26,20" />
                  <path d="M20,14 L20,26" />
                  <circle cx="14" cy="14" r="1.4" fill="#cbd5e1" stroke="none" />
                  <circle cx="26" cy="14" r="1.4" fill="#cbd5e1" stroke="none" />
                  <circle cx="14" cy="26" r="1.4" fill="#cbd5e1" stroke="none" />
                  <circle cx="26" cy="26" r="1.4" fill="#cbd5e1" stroke="none" />
                </>
              )}
              {type === "premolar" && (
                <>
                  <path d="M20,12 L20,28" />
                  <circle cx="20" cy="15" r="1.3" fill="#cbd5e1" stroke="none" />
                  <circle cx="20" cy="25" r="1.3" fill="#cbd5e1" stroke="none" />
                </>
              )}
              {type === "canine" && (
                <path d="M20,10 L20,30" />
              )}
              {type === "incisor" && (
                <path d="M13,20 Q20,22 27,20" />
              )}
            </g>

            <path d={shape} fill={`url(#sheen-${num})`} pointerEvents="none" />
          </g>

          <path d={shape} fill="none" stroke="#64748b" strokeWidth="1" strokeLinejoin="round" />

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
