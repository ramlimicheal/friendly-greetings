import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TreatmentPlanRow = Database["public"]["Tables"]["treatment_plans"]["Row"];
export type TreatmentPlanInsert = Database["public"]["Tables"]["treatment_plans"]["Insert"];
export type TreatmentPlanItemRow = Database["public"]["Tables"]["treatment_plan_items"]["Row"];
export type TreatmentPlanItemInsert = Database["public"]["Tables"]["treatment_plan_items"]["Insert"];
export type FeeRow = Database["public"]["Tables"]["fee_schedule"]["Row"];

export const PLAN_STATUSES = ["draft", "proposed", "accepted", "completed", "declined"] as const;
export const ITEM_STATUSES = ["planned", "accepted", "completed", "declined"] as const;

export async function listPlansForPatient(patient_id: string): Promise<TreatmentPlanRow[]> {
  const { data, error } = await supabase
    .from("treatment_plans")
    .select("*")
    .eq("patient_id", patient_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPlan(input: TreatmentPlanInsert): Promise<TreatmentPlanRow> {
  const { data: userRes } = await supabase.auth.getUser();
  const payload: TreatmentPlanInsert = { ...input, created_by: userRes.user?.id ?? null };
  const { data, error } = await supabase.from("treatment_plans").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updatePlan(id: string, patch: Partial<TreatmentPlanInsert>): Promise<TreatmentPlanRow> {
  const { data, error } = await supabase.from("treatment_plans").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from("treatment_plans").delete().eq("id", id);
  if (error) throw error;
}

export async function listItems(plan_id: string): Promise<TreatmentPlanItemRow[]> {
  const { data, error } = await supabase
    .from("treatment_plan_items")
    .select("*")
    .eq("plan_id", plan_id)
    .order("phase", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addItem(input: TreatmentPlanItemInsert): Promise<TreatmentPlanItemRow> {
  const { data, error } = await supabase.from("treatment_plan_items").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateItem(id: string, patch: Partial<TreatmentPlanItemInsert>): Promise<TreatmentPlanItemRow> {
  const { data, error } = await supabase.from("treatment_plan_items").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("treatment_plan_items").delete().eq("id", id);
  if (error) throw error;
}

export async function listFees(): Promise<FeeRow[]> {
  const { data, error } = await supabase.from("fee_schedule").select("*").order("code");
  if (error) throw error;
  return data ?? [];
}

export function planTotals(items: TreatmentPlanItemRow[]) {
  let total = 0, completed = 0, planned = 0;
  for (const it of items) {
    const fee = Number(it.fee);
    total += fee;
    if (it.status === "completed") completed += fee;
    else planned += fee;
  }
  return { total, completed, planned };
}
