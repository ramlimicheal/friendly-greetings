import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
export type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
export type PatientUpdate = Database["public"]["Tables"]["patients"]["Update"];
export type PatientStatus = Database["public"]["Enums"]["patient_status"];
export type PatientSex = Database["public"]["Enums"]["patient_sex"];

export const PATIENT_STATUSES: PatientStatus[] = ["Active", "New", "Recall", "Overdue"];

export function initialsOf(fullName: string | null | undefined): string {
  if (!fullName) return "?";
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export async function listPatients(): Promise<PatientRow[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPatient(id: string): Promise<PatientRow | null> {
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPatient(input: PatientInsert): Promise<PatientRow> {
  const { data: userRes } = await supabase.auth.getUser();
  const payload: PatientInsert = { ...input, created_by: userRes.user?.id ?? null };
  const { data, error } = await supabase.from("patients").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updatePatient(id: string, patch: PatientUpdate): Promise<PatientRow> {
  const { data, error } = await supabase.from("patients").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}
