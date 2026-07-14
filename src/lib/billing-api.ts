import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InsurancePlanRow = Database["public"]["Tables"]["insurance_plans"]["Row"];
export type InsurancePlanInsert = Database["public"]["Tables"]["insurance_plans"]["Insert"];
export type PatientInsuranceRow = Database["public"]["Tables"]["patient_insurance"]["Row"];
export type PatientInsuranceInsert = Database["public"]["Tables"]["patient_insurance"]["Insert"];
export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type InvoiceItemRow = Database["public"]["Tables"]["invoice_items"]["Row"];
export type InvoiceItemInsert = Database["public"]["Tables"]["invoice_items"]["Insert"];
export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type ClaimRow = Database["public"]["Tables"]["insurance_claims"]["Row"];
export type ClaimInsert = Database["public"]["Tables"]["insurance_claims"]["Insert"];
export type ClaimItemRow = Database["public"]["Tables"]["claim_items"]["Row"];
export type ClaimItemInsert = Database["public"]["Tables"]["claim_items"]["Insert"];

export const CATEGORIES = ["preventive", "basic", "major", "ortho", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
export const INVOICE_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "void"] as const;
export const CLAIM_STATUSES = ["draft", "submitted", "in_review", "paid", "denied", "resubmit"] as const;
export const PAYMENT_METHODS = ["cash", "card", "check", "bank_transfer", "insurance", "other"] as const;

// Insurance plans
export async function listInsurancePlans(): Promise<InsurancePlanRow[]> {
  const { data, error } = await supabase.from("insurance_plans").select("*").eq("active", true).order("payer_name");
  if (error) throw error;
  return data ?? [];
}
export async function createInsurancePlan(input: InsurancePlanInsert): Promise<InsurancePlanRow> {
  const { data, error } = await supabase.from("insurance_plans").insert(input).select().single();
  if (error) throw error;
  return data;
}

// Patient insurance
export async function listPatientInsurance(patient_id: string) {
  const { data, error } = await supabase
    .from("patient_insurance")
    .select("*, plan:insurance_plans(*)")
    .eq("patient_id", patient_id)
    .order("is_primary", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function addPatientInsurance(input: PatientInsuranceInsert): Promise<PatientInsuranceRow> {
  const { data, error } = await supabase.from("patient_insurance").insert(input).select().single();
  if (error) throw error;
  return data;
}
export async function removePatientInsurance(id: string) {
  const { error } = await supabase.from("patient_insurance").delete().eq("id", id);
  if (error) throw error;
}

// Invoices
export async function listInvoices(opts: { patient_id?: string } = {}): Promise<(InvoiceRow & { patient: { full_name: string; chart_no: string } | null })[]> {
  let q = supabase
    .from("invoices")
    .select("*, patient:patients(full_name, chart_no)")
    .order("created_at", { ascending: false });
  if (opts.patient_id) q = q.eq("patient_id", opts.patient_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as any;
}
export async function getInvoice(id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, patient:patients(*), items:invoice_items(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as InvoiceRow & { patient: any; items: InvoiceItemRow[] };
}
export async function createInvoice(input: InvoiceInsert, items: Omit<InvoiceItemInsert, "invoice_id">[]): Promise<InvoiceRow> {
  const { data: userRes } = await supabase.auth.getUser();
  const totals = calcInvoiceTotals(items);
  const payload: InvoiceInsert = {
    ...input,
    created_by: userRes.user?.id ?? null,
    subtotal: totals.subtotal,
    insurance_estimate: totals.insurance,
    patient_portion: totals.patient,
  };
  const { data: inv, error } = await supabase.from("invoices").insert(payload).select().single();
  if (error) throw error;
  if (items.length) {
    const rows = items.map((it, idx) => ({ ...it, invoice_id: inv.id, sort_order: idx }));
    const { error: ie } = await supabase.from("invoice_items").insert(rows);
    if (ie) throw ie;
  }
  return inv;
}
export async function updateInvoice(id: string, patch: Partial<InvoiceInsert>) {
  const { data, error } = await supabase.from("invoices").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

// Payments
export async function listPayments(opts: { patient_id?: string; invoice_id?: string } = {}) {
  let q = supabase
    .from("payments")
    .select("*, patient:patients(full_name, chart_no), invoice:invoices(invoice_no)")
    .order("received_on", { ascending: false });
  if (opts.patient_id) q = q.eq("patient_id", opts.patient_id);
  if (opts.invoice_id) q = q.eq("invoice_id", opts.invoice_id);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
export async function recordPayment(input: PaymentInsert): Promise<PaymentRow> {
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("payments")
    .insert({ ...input, created_by: userRes.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;

  // Update invoice amount_paid & status
  if (input.invoice_id) {
    const { data: pays } = await supabase.from("payments").select("amount").eq("invoice_id", input.invoice_id);
    const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const { data: inv } = await supabase.from("invoices").select("patient_portion").eq("id", input.invoice_id).single();
    const patientPortion = Number(inv?.patient_portion ?? 0);
    const status = paid >= patientPortion && patientPortion > 0 ? "paid" : paid > 0 ? "partial" : "sent";
    await supabase.from("invoices").update({ amount_paid: paid, status }).eq("id", input.invoice_id);
  }

  // Update patient balance
  await refreshPatientBalance(input.patient_id);
  return data;
}

export async function refreshPatientBalance(patient_id: string) {
  const { data: invs } = await supabase.from("invoices").select("patient_portion, amount_paid, status").eq("patient_id", patient_id);
  const balance = (invs ?? [])
    .filter((i: any) => i.status !== "void")
    .reduce((s, i: any) => s + (Number(i.patient_portion) - Number(i.amount_paid)), 0);
  await supabase.from("patients").update({ balance }).eq("id", patient_id);
  return balance;
}

// Claims
export async function listClaims(opts: { patient_id?: string } = {}) {
  let q = supabase
    .from("insurance_claims")
    .select("*, patient:patients(full_name, chart_no), plan:insurance_plans(payer_name, plan_name)")
    .order("created_at", { ascending: false });
  if (opts.patient_id) q = q.eq("patient_id", opts.patient_id);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
export async function getClaim(id: string) {
  const { data, error } = await supabase
    .from("insurance_claims")
    .select("*, patient:patients(*), plan:insurance_plans(*), items:claim_items(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as ClaimRow & { patient: any; plan: any; items: ClaimItemRow[] };
}
export async function createClaim(input: ClaimInsert, items: Omit<ClaimItemInsert, "claim_id">[]) {
  const { data: userRes } = await supabase.auth.getUser();
  const billed = items.reduce((s, it) => s + Number(it.fee || 0), 0);
  const { data: cl, error } = await supabase
    .from("insurance_claims")
    .insert({ ...input, billed_amount: billed, created_by: userRes.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  if (items.length) {
    const rows = items.map((it, idx) => ({ ...it, claim_id: cl.id, sort_order: idx }));
    const { error: ie } = await supabase.from("claim_items").insert(rows);
    if (ie) throw ie;
  }
  return cl;
}
export async function updateClaim(id: string, patch: Partial<ClaimInsert>) {
  const { data, error } = await supabase.from("insurance_claims").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteClaim(id: string) {
  const { error } = await supabase.from("insurance_claims").delete().eq("id", id);
  if (error) throw error;
}

// Coverage estimator
export function coveragePct(plan: InsurancePlanRow | null | undefined, category: string): number {
  if (!plan) return 0;
  switch (category) {
    case "preventive": return plan.preventive_pct;
    case "basic": return plan.basic_pct;
    case "major": return plan.major_pct;
    case "ortho": return plan.ortho_pct;
    default: return 0;
  }
}

export function estimate(
  plan: InsurancePlanRow | null | undefined,
  benefitsUsed: number,
  items: { fee: number; category: string }[],
): { insurance: number; patient: number; subtotal: number; remainingBenefit: number } {
  const subtotal = items.reduce((s, i) => s + Number(i.fee || 0), 0);
  if (!plan) return { insurance: 0, patient: subtotal, subtotal, remainingBenefit: 0 };
  const remaining = Math.max(0, Number(plan.annual_maximum) - Number(benefitsUsed));
  let insurance = 0;
  for (const it of items) {
    const pct = coveragePct(plan, it.category);
    insurance += (Number(it.fee || 0) * pct) / 100;
  }
  insurance = Math.min(insurance, remaining);
  return { insurance, patient: subtotal - insurance, subtotal, remainingBenefit: remaining - insurance };
}

export function calcInvoiceTotals(items: { fee?: number | string | null; insurance_estimate?: number | string | null; patient_portion?: number | string | null }[]) {
  let subtotal = 0, insurance = 0, patient = 0;
  for (const it of items) {
    const fee = Number(it.fee ?? 0);
    subtotal += fee;
    insurance += Number(it.insurance_estimate ?? 0);
    patient += Number(it.patient_portion ?? fee - Number(it.insurance_estimate ?? 0));
  }
  return { subtotal, insurance, patient };
}

export function agingBuckets(invoices: { patient_portion: number | string; amount_paid: number | string; issue_date: string; status: string }[]) {
  const now = Date.now();
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const i of invoices) {
    if (i.status === "void" || i.status === "paid") continue;
    const outstanding = Number(i.patient_portion) - Number(i.amount_paid);
    if (outstanding <= 0) continue;
    const days = Math.floor((now - new Date(i.issue_date).getTime()) / 86400000);
    if (days <= 30) buckets["0-30"] += outstanding;
    else if (days <= 60) buckets["31-60"] += outstanding;
    else if (days <= 90) buckets["61-90"] += outstanding;
    else buckets["90+"] += outstanding;
  }
  return buckets;
}
