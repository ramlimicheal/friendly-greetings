import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
export type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "unconfirmed",
  "confirmed",
  "arrived",
  "in-chair",
  "completed",
  "cancelled",
  "no-show",
];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  unconfirmed: "Unconfirmed",
  confirmed: "Confirmed",
  arrived: "Arrived",
  "in-chair": "In chair",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

// Extends a row with the joined patient name; simpler than a nested type.
export type AppointmentWithPatient = AppointmentRow & { patient_name: string };

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
export function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

export function endTimestamp(row: Pick<AppointmentRow, "start_at" | "duration_min">): Date {
  return new Date(new Date(row.start_at).getTime() + row.duration_min * 60_000);
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export async function listAppointmentsForRange(from: Date, to: Date): Promise<AppointmentWithPatient[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, patients:patient_id (full_name)")
    .gte("start_at", from.toISOString())
    .lte("start_at", to.toISOString())
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const { patients, ...rest } = r as AppointmentRow & { patients: { full_name: string } | null };
    return { ...rest, patient_name: patients?.full_name ?? "Unknown" };
  });
}

/** Compact history for no-show risk scoring. */
export async function listAppointmentHistory(days = 180): Promise<{ patient_id: string; start_at: string; status: AppointmentStatus }[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("appointments")
    .select("patient_id, start_at, status")
    .gte("start_at", since)
    .lte("start_at", new Date().toISOString());
  if (error) throw error;
  return (data ?? []) as any;


export async function createAppointment(input: AppointmentInsert): Promise<AppointmentRow> {
  const { data: userRes } = await supabase.auth.getUser();
  const payload: AppointmentInsert = { ...input, created_by: userRes.user?.id ?? null };
  const { data, error } = await supabase.from("appointments").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAppointment(id: string, patch: AppointmentUpdate): Promise<AppointmentRow> {
  const { data, error } = await supabase.from("appointments").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

export type ConflictRow = {
  id: string;
  patient_id: string;
  start_at: string;
  duration_min: number;
  chair: number;
  provider: string;
  conflict_type: "chair" | "provider" | "chair+provider";
};

export async function checkAppointmentConflict(args: {
  chair: number;
  provider: string;
  start_at: string;
  duration_min: number;
  exclude_id?: string;
}): Promise<ConflictRow[]> {
  const { data, error } = await supabase.rpc("check_appointment_conflict", {
    _chair: args.chair,
    _provider: args.provider,
    _start_at: args.start_at,
    _duration_min: args.duration_min,
    _exclude_id: args.exclude_id,
  });
  if (error) throw error;
  return (data ?? []) as ConflictRow[];
}

/** Reschedule to a new chair/start_at, checking conflicts first. */
export async function rescheduleAppointment(
  appt: Pick<AppointmentRow, "id" | "provider" | "duration_min">,
  newChair: number,
  newStart: Date,
): Promise<{ ok: true } | { ok: false; conflicts: ConflictRow[] }> {
  const conflicts = await checkAppointmentConflict({
    chair: newChair,
    provider: appt.provider,
    start_at: newStart.toISOString(),
    duration_min: appt.duration_min,
    exclude_id: appt.id,
  });
  if (conflicts.length > 0) return { ok: false, conflicts };
  await updateAppointment(appt.id, { chair: newChair, start_at: newStart.toISOString() });
  return { ok: true };
}
