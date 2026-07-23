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
    .select("user_id, patient_id, clinic_id, is_active")
    .eq("user_id", u.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  return { user_id: data.user_id, patient_id: data.patient_id, clinic_id: data.clinic_id };
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

// ---- Portal invitations ----

export type PortalInvitePeek = {
  valid: boolean;
  reason: string | null;
  email_masked: string | null;
  clinic_name: string | null;
  expires_at: string | null;
};

export async function peekPortalInvitation(token: string): Promise<PortalInvitePeek | null> {
  const { data, error } = await supabase.rpc("peek_portal_invitation", { _raw_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as PortalInvitePeek) ?? null;
}

export async function acceptPortalInvitation(token: string) {
  const { data, error } = await supabase.rpc("accept_portal_invitation", { _raw_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { patient_id: string; clinic_id: string } | null;
}

// ---- Staff-side invitation management ----

export type StaffPortalInvitation = {
  id: string;
  email_masked: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export async function listPatientPortalInvitations(patientId: string): Promise<StaffPortalInvitation[]> {
  const { data, error } = await supabase.rpc("list_patient_portal_invitations", { _patient_id: patientId });
  if (error) throw error;
  return (data ?? []) as StaffPortalInvitation[];
}

export async function createPortalInvitation(patientId: string, email: string) {
  const { data, error } = await supabase.rpc("create_portal_invitation", {
    _patient_id: patientId,
    _email: email,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { id: string; raw_token: string };
}

export async function revokePortalInvitation(invitationId: string) {
  const { error } = await supabase.rpc("revoke_portal_invitation", { _invitation_id: invitationId });
  if (error) throw error;
}

export async function revokePortalAccess(patientId: string) {
  const { error } = await supabase.rpc("revoke_portal_access", { _patient_id: patientId });
  if (error) throw error;
}
