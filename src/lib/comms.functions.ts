import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Channel = "sms" | "email";

async function getClinicSettings(supabase: any, clinicId: string) {
  const { data } = await supabase
    .from("clinic_settings")
    .select("*")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  return data;
}

async function getClinic(supabase: any, clinicId: string) {
  const { data } = await supabase.from("clinics").select("id, name").eq("id", clinicId).maybeSingle();
  return data;
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_m, k) => vars[k] ?? "");
}

async function sendSmsViaTwilio(to: string, body: string): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!lovableKey || !twilioKey || !from) {
    return { ok: false, error: "SMS not configured (Twilio connector or TWILIO_FROM_NUMBER missing)" };
  }
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!res.ok) return { ok: false, error: `Twilio ${res.status}: ${await res.text()}` };
    const json: any = await res.json();
    return { ok: true, ref: json.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMS send failed" };
  }
}

async function sendEmailViaLovable(
  to: string,
  subject: string,
  body: string,
  from: string,
): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: false, error: "LOVABLE_API_KEY not configured" };
  if (!from) return { ok: false, error: "Sender email not configured in clinic settings" };
  try {
    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    const html = `<div style="font-family:Arial,sans-serif;white-space:pre-line">${body.replace(/</g, "&lt;")}</div>`;
    const res = await sendLovableEmail(
      { to, from, subject, html, text: body },
      { apiKey },
    );
    if (!res.success) return { ok: false, error: res.status ?? "not sent" };
    return { ok: true, ref: res.message_id ?? "sent" };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Email send failed" };
  }
}

export const sendCommunication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    clinic_id: string;
    channel: Channel;
    to: string;
    subject?: string;
    body: string;
    patient_id?: string;
    appointment_id?: string;
    purpose?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // insert queued row
    const { data: row, error: insErr } = await supabase
      .from("communications")
      .insert({
        clinic_id: data.clinic_id,
        patient_id: data.patient_id ?? null,
        appointment_id: data.appointment_id ?? null,
        sent_by: userId,
        channel: data.channel,
        to_address: data.to,
        subject: data.subject ?? null,
        body: data.body,
        purpose: data.purpose ?? "manual",
        status: "queued",
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);

    const settings = await getClinicSettings(supabase, data.clinic_id);
    const fromEmail = settings?.email_from_address ?? "";

    const result =
      data.channel === "sms"
        ? await sendSmsViaTwilio(data.to, data.body)
        : await sendEmailViaLovable(data.to, data.subject ?? "Message from your clinic", data.body, fromEmail);

    await supabase
      .from("communications")
      .update({
        status: result.ok ? "sent" : "failed",
        provider_ref: result.ok ? result.ref : null,
        error: result.ok ? null : result.error,
      })
      .eq("id", row.id);

    return { id: row.id, sent: result.ok, error: result.ok ? null : result.error };
  });

export const listCommunications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clinic_id: string; patient_id?: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("communications")
      .select("*, patient:patients(id, full_name)")
      .eq("clinic_id", data.clinic_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.patient_id) q = q.eq("patient_id", data.patient_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getClinicCommsSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clinic_id: string }) => d)
  .handler(async ({ data, context }) => {
    const s = await getClinicSettings(context.supabase, data.clinic_id);
    if (s) return s;
    // create default row on first read
    const { data: created } = await context.supabase
      .from("clinic_settings")
      .insert({ clinic_id: data.clinic_id })
      .select("*")
      .single();
    return created;
  });

export const updateClinicCommsSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    clinic_id: string;
    sms_enabled?: boolean;
    email_enabled?: boolean;
    reminder_hours_before?: number;
    sms_from?: string | null;
    email_from_name?: string | null;
    email_from_address?: string | null;
    reminder_sms_template?: string;
    reminder_email_subject?: string;
    reminder_email_body?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { clinic_id, ...update } = data;
    const { data: row, error } = await context.supabase
      .from("clinic_settings")
      .upsert({ clinic_id, ...update })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// send an appointment reminder to a patient using the templates
export const sendAppointmentReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { appointment_id: string; channel: Channel }) => d)
  .handler(async ({ data, context }) => {
    const { data: appt, error } = await context.supabase
      .from("appointments")
      .select("*, patient:patients(id, full_name, phone, email, clinic_id)")
      .eq("id", data.appointment_id)
      .maybeSingle();
    if (error || !appt) throw new Error(error?.message ?? "Appointment not found");

    const clinicId = appt.clinic_id ?? appt.patient?.clinic_id;
    const [settings, clinic] = await Promise.all([
      getClinicSettings(context.supabase, clinicId),
      getClinic(context.supabase, clinicId),
    ]);

    const start = new Date(appt.start_at);
    const vars: Record<string, string> = {
      patient_first_name: (appt.patient?.full_name ?? "there").split(" ")[0],
      patient_full_name: appt.patient?.full_name ?? "",
      clinic_name: clinic?.name ?? "your clinic",
      appointment_date: start.toLocaleDateString(),
      appointment_time: start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };

    const to =
      data.channel === "sms"
        ? appt.patient?.phone
        : appt.patient?.email;
    if (!to) throw new Error(`Patient has no ${data.channel === "sms" ? "phone" : "email"} on file`);

    const body =
      data.channel === "sms"
        ? fillTemplate(settings?.reminder_sms_template ?? "Reminder: appointment on {{appointment_date}} at {{appointment_time}}.", vars)
        : fillTemplate(settings?.reminder_email_body ?? "Reminder: appointment on {{appointment_date}} at {{appointment_time}}.", vars);
    const subject = data.channel === "email"
      ? fillTemplate(settings?.reminder_email_subject ?? "Appointment reminder", vars)
      : undefined;

    return await sendCommunication({
      data: {
        clinic_id: clinicId,
        channel: data.channel,
        to,
        subject,
        body,
        patient_id: appt.patient?.id,
        appointment_id: appt.id,
        purpose: "appointment_reminder",
      },
    });
  });
