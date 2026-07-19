import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send, Settings, Mail, Phone, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, SectionHeader } from "@/components/app-shell";
import { useClinic } from "@/hooks/use-clinic";
import { useRequirePermission } from "@/hooks/use-permissions";
import {
  listCommunications,
  sendCommunication,
  getClinicCommsSettings,
  updateClinicCommsSettings,
} from "@/lib/comms.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/communications")({
  head: () => ({ meta: [{ title: "Messages — Enamel" }] }),
  component: CommunicationsPage,
});

type Comm = {
  id: string;
  channel: "sms" | "email";
  to_address: string;
  subject: string | null;
  body: string;
  status: string;
  purpose: string;
  error: string | null;
  created_at: string;
  patient?: { id: string; full_name: string } | null;
};

function CommunicationsPage() {
  useRequirePermission("patients.view");
  const { activeClinicId } = useClinic();
  const [tab, setTab] = useState<"send" | "history" | "settings">("send");

  return (
    <AppShell title="Messages" subtitle="Send and track SMS & email to patients">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex gap-1 rounded-full border border-border bg-muted/40 p-1 w-fit">
          {(["send", "history", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium capitalize " +
                (tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>

        {!activeClinicId ? (
          <Card><p className="text-sm text-muted-foreground">No active clinic.</p></Card>
        ) : tab === "send" ? (
          <SendTab clinicId={activeClinicId} />
        ) : tab === "history" ? (
          <HistoryTab clinicId={activeClinicId} />
        ) : (
          <SettingsTab clinicId={activeClinicId} />
        )}
      </div>
    </AppShell>
  );
}

function SendTab({ clinicId }: { clinicId: string }) {
  const send = useServerFn(sendCommunication);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    supabase.from("patients").select("id, full_name, phone, email").order("full_name").then(({ data }) => setPatients(data ?? []));
  }, []);

  const selected = patients.find((p) => p.id === patientId);
  const to = selected ? (channel === "sms" ? selected.phone : selected.email) : "";

  const onSend = async () => {
    if (!to) { setResult({ ok: false, msg: `Patient has no ${channel === "sms" ? "phone" : "email"} on file` }); return; }
    setSending(true);
    setResult(null);
    try {
      const r = await send({ data: { clinic_id: clinicId, channel, to, subject: channel === "email" ? subject : undefined, body, patient_id: patientId } });
      setResult({ ok: r.sent, msg: r.sent ? "Message sent." : (r.error ?? "Failed to send") });
      if (r.sent) { setBody(""); setSubject(""); }
    } catch (e: any) {
      setResult({ ok: false, msg: e?.message ?? "Send failed" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Send a message" icon={Send} />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <option value="">Select patient…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          {selected && (
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{selected.phone || "no phone"}</div>
              <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{selected.email || "no email"}</div>
            </div>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel</label>
          <div className="flex gap-2">
            {(["sms", "email"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={"flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize " + (channel === c ? "border-primary bg-primary/10 text-primary" : "border-border")}
              >{c}</button>
            ))}
          </div>
        </div>
        {channel === "email" && (
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder={channel === "sms" ? "Keep SMS under 160 characters when possible." : "Message body…"} />
          {channel === "sms" && <div className="mt-1 text-[11px] text-muted-foreground">{body.length} characters</div>}
        </div>
      </div>

      {result && (
        <div className={"mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs " + (result.ok ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100" : "bg-red-50 text-red-800 ring-1 ring-red-100")}>
          {result.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {result.msg}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <PrimaryButton icon={sending ? Loader2 : Send} onClick={onSend} disabled={sending || !patientId || !body.trim() || !to}>
          {sending ? "Sending…" : `Send ${channel.toUpperCase()}`}
        </PrimaryButton>
      </div>
    </Card>
  );
}

function HistoryTab({ clinicId }: { clinicId: string }) {
  const list = useServerFn(listCommunications);
  const [rows, setRows] = useState<Comm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    list({ data: { clinic_id: clinicId } }).then((r) => { setRows(r as any); setLoading(false); });
  }, [clinicId, list]);

  return (
    <Card>
      <SectionHeader title="Recent messages" icon={MessageSquare} />
      {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
        rows.length === 0 ? <p className="text-xs text-muted-foreground">No messages sent yet.</p> : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                {r.channel === "sms" ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.patient?.full_name ?? r.to_address}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{r.purpose.replace(/_/g, " ")}</span>
                  <StatusPill status={r.status} />
                </div>
                {r.subject && <div className="mt-0.5 text-xs font-medium">{r.subject}</div>}
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.body}</div>
                {r.error && <div className="mt-1 text-[11px] text-red-700">{r.error}</div>}
              </div>
              <div className="whitespace-nowrap text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: "bg-emerald-100 text-emerald-800",
    queued: "bg-sky-100 text-sky-800",
    failed: "bg-red-100 text-red-800",
    suppressed: "bg-amber-100 text-amber-800",
  };
  return <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + (map[status] ?? "bg-muted text-muted-foreground")}>{status}</span>;
}

function SettingsTab({ clinicId }: { clinicId: string }) {
  const get = useServerFn(getClinicCommsSettings);
  const upd = useServerFn(updateClinicCommsSettings);
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { get({ data: { clinic_id: clinicId } }).then(setS); }, [clinicId, get]);

  if (!s) return <Card><p className="text-xs text-muted-foreground">Loading…</p></Card>;

  const save = async () => {
    setSaving(true);
    try {
      const r = await upd({ data: { clinic_id: clinicId, ...s } });
      setS(r);
      setMsg("Saved.");
      setTimeout(() => setMsg(""), 2000);
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed");
    } finally { setSaving(false); }
  };

  const set = (k: string, v: any) => setS({ ...s, [k]: v });

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader title="Channels" icon={Settings} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.sms_enabled} onChange={(e) => set("sms_enabled", e.target.checked)} /> Enable SMS reminders</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.email_enabled} onChange={(e) => set("email_enabled", e.target.checked)} /> Enable email reminders</label>
          <Field label="Reminder hours before" type="number" value={s.reminder_hours_before} onChange={(v) => set("reminder_hours_before", parseInt(v || "24", 10))} />
          <Field label="SMS sender (Twilio number)" value={s.sms_from ?? ""} onChange={(v) => set("sms_from", v)} placeholder="+15551234567" />
          <Field label="Email from name" value={s.email_from_name ?? ""} onChange={(v) => set("email_from_name", v)} />
          <Field label="Email from address" value={s.email_from_address ?? ""} onChange={(v) => set("email_from_address", v)} placeholder="notify@yourclinic.com" />
        </div>
      </Card>
      <Card>
        <SectionHeader title="Reminder templates" icon={MessageSquare} />
        <p className="mb-2 text-xs text-muted-foreground">Variables: <code>{"{{patient_first_name}}"}</code>, <code>{"{{clinic_name}}"}</code>, <code>{"{{appointment_date}}"}</code>, <code>{"{{appointment_time}}"}</code></p>
        <div className="space-y-3">
          <TextArea label="SMS template" value={s.reminder_sms_template} onChange={(v) => set("reminder_sms_template", v)} rows={3} />
          <Field label="Email subject" value={s.reminder_email_subject} onChange={(v) => set("reminder_email_subject", v)} />
          <TextArea label="Email body" value={s.reminder_email_body} onChange={(v) => set("reminder_email_body", v)} rows={6} />
        </div>
      </Card>
      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        <PrimaryButton icon={saving ? Loader2 : CheckCircle2} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono" />
    </div>
  );
}
