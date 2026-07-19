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

export type PortalPlan = {
  id: string;
  title: string;
  status: string;
  presented_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  items: {
    id: string;
    description: string | null;
    tooth_number: number | null;
    status: string;
    fee: number | null;
  }[];
  total_fee: number;
};

export async function getPortalPlans(patientId: string): Promise<PortalPlan[]> {
  const { data, error } = await supabase
    .from("treatment_plans")
    .select(
      "id, title, status, presented_at, accepted_at, completed_at, created_at, treatment_plan_items(id, description, tooth_number, status, fee)",
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => {
    const items = p.treatment_plan_items ?? [];
    const total = items.reduce((s, it) => s + Number(it.fee ?? 0), 0);
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      presented_at: p.presented_at,
      accepted_at: p.accepted_at,
      completed_at: p.completed_at,
      created_at: p.created_at,
      items,
      total_fee: total,
    };
  });
}

export type PortalInvoice = {
  id: string;
  invoice_no: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total: number;
  balance: number;
};

export async function getPortalInvoices(patientId: string): Promise<PortalInvoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_no, status, issue_date, due_date, subtotal, patient_portion, amount_paid")
    .eq("patient_id", patientId)
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((i) => ({
    id: i.id,
    invoice_no: i.invoice_no,
    status: i.status,
    issue_date: i.issue_date,
    due_date: i.due_date,
    total: Number(i.subtotal ?? 0),
    balance: Math.max(0, Number(i.patient_portion ?? 0) - Number(i.amount_paid ?? 0)),
  }));
}
