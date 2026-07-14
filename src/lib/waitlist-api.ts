import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WaitlistRow = Database["public"]["Tables"]["waitlist"]["Row"];
export type WaitlistInsert = Database["public"]["Tables"]["waitlist"]["Insert"];
export type WaitlistUpdate = Database["public"]["Tables"]["waitlist"]["Update"];
export type WaitlistWithPatient = WaitlistRow & { patient_name: string; chart_no: string };

export async function listWaitlist(status: "active" | "scheduled" | "removed" | "all" = "active"): Promise<WaitlistWithPatient[]> {
  let q = supabase
    .from("waitlist")
    .select("*, patients:patient_id (full_name, chart_no)")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => {
    const { patients, ...rest } = r as WaitlistRow & { patients: { full_name: string; chart_no: string } | null };
    return { ...rest, patient_name: patients?.full_name ?? "Unknown", chart_no: patients?.chart_no ?? "" };
  });
}

export async function createWaitlist(input: WaitlistInsert): Promise<WaitlistRow> {
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("waitlist")
    .insert({ ...input, created_by: userRes.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWaitlist(id: string, patch: WaitlistUpdate): Promise<WaitlistRow> {
  const { data, error } = await supabase.from("waitlist").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteWaitlist(id: string): Promise<void> {
  const { error } = await supabase.from("waitlist").delete().eq("id", id);
  if (error) throw error;
}

export async function markWaitlistScheduled(id: string): Promise<void> {
  await updateWaitlist(id, { status: "scheduled" });
}
