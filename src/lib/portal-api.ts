import { supabase } from "@/integrations/supabase/client";

export type PortalLink = {
  user_id: string;
  patient_id: string;
  clinic_id: string;
};

export async function getPortalLink(): Promise<PortalLink | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("patient_portal_users")
    .select("user_id, patient_id, clinic_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return (data as PortalLink | null) ?? null;
}

export async function getPortalPatient(patientId: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, chart_no, email, phone, next_visit_at, last_visit_at, balance, allergies, medications")
    .eq("id", patientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPortalAppointments(patientId: string) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, start_at, duration_min, provider, chair, status, notes")
    .eq("patient_id", patientId)
    .order("start_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getPortalPlans(patientId: string) {
  const { data, error } = await supabase
    .from("treatment_plans")
    .select("id, title, status, total_fee, patient_responsibility, created_at, treatment_plan_items(id, description, tooth, status, fee)")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPortalInvoices(patientId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_no, status, total, balance, issued_at, due_at")
    .eq("patient_id", patientId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
