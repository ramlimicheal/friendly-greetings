import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
export type BookingRequestRow = Database["public"]["Tables"]["booking_requests"]["Row"];
export type BookingRequestInsert = Database["public"]["Tables"]["booking_requests"]["Insert"];
export type BookingRequestUpdate = Database["public"]["Tables"]["booking_requests"]["Update"];
export type IntakeFormRow = Database["public"]["Tables"]["intake_forms"]["Row"];
export type IntakeFormInsert = Database["public"]["Tables"]["intake_forms"]["Insert"];

export const BOOKING_STATUSES = ["pending", "scheduled", "declined", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export async function listActiveServices(): Promise<ServiceRow[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function submitBookingRequest(input: BookingRequestInsert): Promise<BookingRequestRow> {
  const { data, error } = await supabase.from("booking_requests").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function submitIntakeForm(input: IntakeFormInsert): Promise<IntakeFormRow> {
  const payload: IntakeFormInsert = {
    ...input,
    signed_at: input.signature ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase.from("intake_forms").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function listBookingRequests(status?: BookingStatus): Promise<BookingRequestRow[]> {
  let q = supabase.from("booking_requests").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function updateBookingRequest(id: string, patch: BookingRequestUpdate): Promise<BookingRequestRow> {
  const { data: userRes } = await supabase.auth.getUser();
  const payload: BookingRequestUpdate = {
    ...patch,
    handled_by: patch.handled_by ?? userRes.user?.id ?? null,
    handled_at: patch.handled_at ?? new Date().toISOString(),
  };
  const { data, error } = await supabase.from("booking_requests").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function listIntakeForms(): Promise<IntakeFormRow[]> {
  const { data, error } = await supabase
    .from("intake_forms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Create a patient from a booking request (used by staff to convert). */
export async function createPatientFromBooking(b: BookingRequestRow): Promise<string> {
  const { data: userRes } = await supabase.auth.getUser();
  const insert = {
    full_name: b.full_name,
    phone: b.phone,
    email: b.email,
    date_of_birth: b.date_of_birth,
    status: "New" as const,
    created_by: userRes.user?.id ?? null,
  };
  const { data, error } = await supabase.from("patients").insert(insert).select("id").single();
  if (error) throw error;
  return data.id;
}

