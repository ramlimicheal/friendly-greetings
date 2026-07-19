import { supabase } from "@/integrations/supabase/client";

export type FileCategory = "xray" | "photo" | "consent" | "insurance" | "document";

export type PatientFileRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  uploaded_by: string | null;
  category: FileCategory;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const BUCKET = "clinic-files";

export async function listPatientFiles(patientId: string): Promise<PatientFileRow[]> {
  const { data, error } = await supabase
    .from("patient_files")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PatientFileRow[];
}

export async function uploadPatientFile(params: {
  clinicId: string;
  patientId: string;
  file: File;
  category: FileCategory;
  notes?: string;
}): Promise<PatientFileRow> {
  const { clinicId, patientId, file, category, notes } = params;
  const cleanName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${clinicId}/${patientId}/${crypto.randomUUID()}-${cleanName}`;

  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (up.error) throw up.error;

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("patient_files")
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      uploaded_by: userData.user?.id ?? null,
      category,
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
      notes: notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // best-effort cleanup
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data as PatientFileRow;
}

export async function getSignedFileUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deletePatientFile(row: PatientFileRow): Promise<void> {
  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  const { error } = await supabase.from("patient_files").delete().eq("id", row.id);
  if (error) throw error;
}

export function humanSize(bytes: number | null): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
