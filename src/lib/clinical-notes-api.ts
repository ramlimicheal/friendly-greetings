import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ClinicalNoteRow = Database["public"]["Tables"]["clinical_notes"]["Row"];
export type ClinicalNoteInsert = Database["public"]["Tables"]["clinical_notes"]["Insert"];

export async function listNotes(patient_id: string): Promise<ClinicalNoteRow[]> {
  const { data, error } = await supabase
    .from("clinical_notes")
    .select("*")
    .eq("patient_id", patient_id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createNote(input: ClinicalNoteInsert): Promise<ClinicalNoteRow> {
  const { data: userRes } = await supabase.auth.getUser();
  const payload: ClinicalNoteInsert = { ...input, created_by: userRes.user?.id ?? null };
  const { data, error } = await supabase.from("clinical_notes").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateNote(id: string, patch: Partial<ClinicalNoteInsert>): Promise<ClinicalNoteRow> {
  const { data, error } = await supabase.from("clinical_notes").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function signNote(id: string): Promise<ClinicalNoteRow> {
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("clinical_notes")
    .update({ signed_at: new Date().toISOString(), signed_by: userRes.user?.id ?? null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("clinical_notes").delete().eq("id", id);
  if (error) throw error;
}
