import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RecallRow = Database["public"]["Tables"]["recalls"]["Row"];
export type RecallInsert = Database["public"]["Tables"]["recalls"]["Insert"];
export type RecallUpdate = Database["public"]["Tables"]["recalls"]["Update"];
export type RecallWithPatient = RecallRow & { patient_name: string; chart_no: string };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeNextDue(from: Date, months: number): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return isoDate(d);
}

export async function listRecalls(opts: { activeOnly?: boolean; dueBefore?: Date } = {}): Promise<RecallWithPatient[]> {
  let q = supabase
    .from("recalls")
    .select("*, patients:patient_id (full_name, chart_no)")
    .order("next_due_at", { ascending: true });
  if (opts.activeOnly) q = q.eq("active", true);
  if (opts.dueBefore) q = q.lte("next_due_at", isoDate(opts.dueBefore));
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => {
    const { patients, ...rest } = r as RecallRow & { patients: { full_name: string; chart_no: string } | null };
    return { ...rest, patient_name: patients?.full_name ?? "Unknown", chart_no: patients?.chart_no ?? "" };
  });
}

export async function listRecallsForPatient(patient_id: string): Promise<RecallRow[]> {
  const { data, error } = await supabase.from("recalls").select("*").eq("patient_id", patient_id).order("next_due_at");
  if (error) throw error;
  return data ?? [];
}

export async function createRecall(input: RecallInsert): Promise<RecallRow> {
  const payload: RecallInsert = {
    ...input,
    next_due_at: input.next_due_at ?? computeNextDue(new Date(), input.interval_months ?? 6),
  };
  const { data, error } = await supabase.from("recalls").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateRecall(id: string, patch: RecallUpdate): Promise<RecallRow> {
  const { data, error } = await supabase.from("recalls").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRecall(id: string): Promise<void> {
  const { error } = await supabase.from("recalls").delete().eq("id", id);
  if (error) throw error;
}

/** Mark a recall as completed today and roll next_due_at forward. */
export async function completeRecall(id: string, months: number): Promise<RecallRow> {
  const today = isoDate(new Date());
  return updateRecall(id, {
    last_completed_at: today,
    next_due_at: computeNextDue(new Date(), months),
  });
}
