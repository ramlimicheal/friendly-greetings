import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ToothChartRow = Database["public"]["Tables"]["tooth_charts"]["Row"];
export type ToothChartInsert = Database["public"]["Tables"]["tooth_charts"]["Insert"];
export type ToothChartUpdate = Database["public"]["Tables"]["tooth_charts"]["Update"];

export type SurfaceKey = "mesial" | "distal" | "buccal" | "lingual" | "occlusal";
export type SurfaceCondition =
  | "sound"
  | "caries"
  | "filling"
  | "crown"
  | "sealant"
  | "veneer";
export type ToothCondition =
  | "present"
  | "missing"
  | "implant"
  | "root_canal"
  | "bridge"
  | "extract_planned";

export const SURFACE_KEYS: SurfaceKey[] = ["mesial", "distal", "buccal", "lingual", "occlusal"];

export const SURFACE_CONDITIONS: { value: SurfaceCondition; label: string; color: string }[] = [
  { value: "sound",   label: "Sound",   color: "#ffffff" },
  { value: "caries",  label: "Caries",  color: "#ef4444" },
  { value: "filling", label: "Filling", color: "#3b82f6" },
  { value: "crown",   label: "Crown",   color: "#f59e0b" },
  { value: "sealant", label: "Sealant", color: "#10b981" },
  { value: "veneer",  label: "Veneer",  color: "#8b5cf6" },
];

export const TOOTH_CONDITIONS: { value: ToothCondition; label: string; color: string }[] = [
  { value: "present",         label: "Present",          color: "#e5e7eb" },
  { value: "missing",         label: "Missing",          color: "#94a3b8" },
  { value: "implant",         label: "Implant",          color: "#06b6d4" },
  { value: "root_canal",      label: "Root canal",       color: "#a855f7" },
  { value: "bridge",          label: "Bridge",           color: "#eab308" },
  { value: "extract_planned", label: "Extraction planned", color: "#f97316" },
];

// FDI-style: Permanent 11-18, 21-28, 31-38, 41-48. Primary 51-55, 61-65, 71-75, 81-85.
export const PERMANENT_UPPER = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
export const PERMANENT_LOWER = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];
export const PRIMARY_UPPER   = [55,54,53,52,51, 61,62,63,64,65];
export const PRIMARY_LOWER   = [85,84,83,82,81, 71,72,73,74,75];

export function surfaceColor(v: SurfaceCondition): string {
  return SURFACE_CONDITIONS.find((s) => s.value === v)?.color ?? "#ffffff";
}
export function toothColor(v: ToothCondition): string {
  return TOOTH_CONDITIONS.find((t) => t.value === v)?.color ?? "#e5e7eb";
}

/** Load the most recent tooth chart entries for a patient (latest per tooth). */
export async function loadLatestChart(patient_id: string): Promise<Record<number, ToothChartRow>> {
  const { data, error } = await supabase
    .from("tooth_charts")
    .select("*")
    .eq("patient_id", patient_id)
    .order("chart_date", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const map: Record<number, ToothChartRow> = {};
  for (const row of data ?? []) {
    if (!map[row.tooth_number]) map[row.tooth_number] = row;
  }
  return map;
}

/** Upsert today's chart entry for a single tooth. */
export async function upsertTooth(input: {
  patient_id: string;
  tooth_number: number;
  dentition: "permanent" | "primary";
  patch: Partial<Pick<ToothChartRow,
    | "surface_mesial" | "surface_distal" | "surface_buccal" | "surface_lingual" | "surface_occlusal"
    | "tooth_condition" | "notes"
  >>;
  existing?: ToothChartRow;
}): Promise<ToothChartRow> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  const base = input.existing;
  const payload: ToothChartInsert = {
    patient_id: input.patient_id,
    tooth_number: input.tooth_number,
    dentition: input.dentition,
    chart_date: today,
    updated_by: uid,
    surface_mesial:   input.patch.surface_mesial   ?? base?.surface_mesial   ?? "sound",
    surface_distal:   input.patch.surface_distal   ?? base?.surface_distal   ?? "sound",
    surface_buccal:   input.patch.surface_buccal   ?? base?.surface_buccal   ?? "sound",
    surface_lingual:  input.patch.surface_lingual  ?? base?.surface_lingual  ?? "sound",
    surface_occlusal: input.patch.surface_occlusal ?? base?.surface_occlusal ?? "sound",
    tooth_condition:  input.patch.tooth_condition  ?? base?.tooth_condition  ?? "present",
    notes:            input.patch.notes            ?? base?.notes            ?? null,
  };
  const { data, error } = await supabase
    .from("tooth_charts")
    .upsert(payload, { onConflict: "patient_id,tooth_number,chart_date" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function cycleSurface(current: SurfaceCondition): SurfaceCondition {
  const idx = SURFACE_CONDITIONS.findIndex((s) => s.value === current);
  return SURFACE_CONDITIONS[(idx + 1) % SURFACE_CONDITIONS.length].value;
}
