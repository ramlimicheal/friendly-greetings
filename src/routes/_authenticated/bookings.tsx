import { createFileRoute } from "@tanstack/react-router";
import { useRequirePermission } from "@/hooks/use-permissions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, ClipboardList, Check, X as XIcon, FileText, Loader2 } from "lucide-react";
import { AppShell, Card, GhostButton, Pill, SectionHeader } from "@/components/app-shell";
import {
  BOOKING_STATUSES,
  createPatientFromBooking,
  listBookingRequests,
  listIntakeForms,
  updateBookingRequest,
  type BookingRequestRow,
  type BookingStatus,
  type IntakeFormRow,
} from "@/lib/booking-api";
import { AppointmentFormDialog } from "@/components/appointment-form-dialog";
import { createAppointment } from "@/lib/appointments-api";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings & intake — Enamel Dental Clinic" },
      { name: "description", content: "Review online booking requests and patient intake submissions." },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  useRequirePermission("bookings.manage");
  const [tab, setTab] = useState<"bookings" | "intake">("bookings");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("pending");
  const [rows, setRows] = useState<BookingRequestRow[]>([]);
  const [intakes, setIntakes] = useState<IntakeFormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState<BookingRequestRow | null>(null);
  const [convertPatientId, setConvertPatientId] = useState<string>("");
  const [viewingIntake, setViewingIntake] = useState<IntakeFormRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [b, i] = await Promise.all([
        listBookingRequests(statusFilter === "all" ? undefined : statusFilter),
        listIntakeForms(),
      ]);
      setRows(b);
      setIntakes(i);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startConvert = async (b: BookingRequestRow) => {
    try {
      const patientId = b.patient_id ?? (await createPatientFromBooking(b));
      setConvertPatientId(patientId);
      setConverting(b);
      setConvertOpen(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create patient record");
    }
  };

  const decline = async (b: BookingRequestRow) => {
    if (!confirm(`Decline booking for ${b.full_name}?`)) return;
    await updateBookingRequest(b.id, { status: "declined" });
    refresh();
  };

  const intakeCount = intakes.filter((i) => i.status === "submitted").length;
  const pendingCount = useMemo(() => rows.filter((r) => r.status === "pending").length, [rows]);

  return (
    <AppShell
      title="Bookings"
      subtitle="Online booking requests and patient intake submissions"
    >
      <div className="mb-4 flex items-center gap-2">
        <TabButton active={tab === "bookings"} onClick={() => setTab("bookings")} icon={Calendar}>
          Requests {statusFilter === "pending" && pendingCount > 0 && <CountPill n={pendingCount} />}
        </TabButton>
        <TabButton active={tab === "intake"} onClick={() => setTab("intake")} icon={ClipboardList}>
          Intake forms {intakeCount > 0 && <CountPill n={intakeCount} />}
        </TabButton>
      </div>

      {tab === "bookings" ? (
        <Card className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <SectionHeader title="Booking requests" icon={Calendar} />
            <div className="flex items-center gap-2">
              <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</FilterChip>
              {BOOKING_STATUSES.map((s) => (
                <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                  {s}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_120px_180px] gap-2 border-b border-t border-border bg-muted/40 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <div>Patient</div>
            <div>Contact</div>
            <div>Requested time</div>
            <div>Reason</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">No booking requests match this filter.</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_120px_180px] items-center gap-2 border-b border-border px-6 py-3.5 text-sm last:border-b-0">
                <div>
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.is_new_patient ? "New patient" : "Existing"}{r.preferred_provider ? " · " + r.preferred_provider : ""}
                  </div>
                </div>
                <div className="text-xs">
                  <div>{r.phone}</div>
                  <div className="text-muted-foreground">{r.email ?? "—"}</div>
                </div>
                <div>
                  {new Date(r.preferred_date + "T" + r.preferred_time).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="truncate text-muted-foreground">{r.reason ?? "—"}</div>
                <div>
                  <Pill
                    tone={
                      r.status === "pending" ? "warn" : r.status === "scheduled" ? "success" : r.status === "declined" ? "danger" : "muted"
                    }
                  >
                    {r.status}
                  </Pill>
                </div>
                <div className="flex justify-end gap-2">
                  {r.status === "pending" ? (
                    <>
                      <button
                        onClick={() => startConvert(r)}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        <Check className="h-3.5 w-3.5" /> Schedule
                      </button>
                      <button
                        onClick={() => decline(r)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <XIcon className="h-3.5 w-3.5" /> Decline
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {r.handled_at ? new Date(r.handled_at).toLocaleDateString() : ""}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="px-6 py-4">
            <SectionHeader title="Intake forms" icon={ClipboardList} />
          </div>
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_120px_120px] gap-2 border-b border-t border-border bg-muted/40 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <div>Patient</div>
            <div>Contact</div>
            <div>Submitted</div>
            <div>Insurance</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          {intakes.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">No intake submissions yet.</div>
          ) : (
            intakes.map((i) => (
              <div key={i.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_120px_120px] items-center gap-2 border-b border-border px-6 py-3.5 text-sm last:border-b-0">
                <div>
                  <div className="font-medium">{i.full_name}</div>
                  <div className="text-xs text-muted-foreground">{i.signed_at ? "Signed " + new Date(i.signed_at).toLocaleDateString() : "Not signed"}</div>
                </div>
                <div className="text-xs">
                  <div>{i.phone ?? "—"}</div>
                  <div className="text-muted-foreground">{i.email ?? "—"}</div>
                </div>
                <div className="text-xs">{new Date(i.created_at).toLocaleString()}</div>
                <div className="text-xs">{i.insurance_carrier ?? "—"}</div>
                <div>
                  <Pill tone={i.status === "submitted" ? "warn" : i.status === "reviewed" ? "success" : "muted"}>{i.status}</Pill>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setViewingIntake(i)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <FileText className="h-3.5 w-3.5" /> View
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {convertOpen && converting && (
        <AppointmentFormDialog
          open={convertOpen}
          onClose={() => {
            setConvertOpen(false);
            setConverting(null);
          }}
          defaultStart={new Date(converting.preferred_date + "T" + converting.preferred_time)}
          prefill={{
            patient_id: convertPatientId,
            provider: converting.preferred_provider ?? "Dr. Patel",
            procedure: converting.reason ?? undefined,
          }}
          onSubmit={async (values) => {
            const appt = await createAppointment(values);
            await updateBookingRequest(converting.id, {
              status: "scheduled",
              patient_id: convertPatientId,
              appointment_id: appt.id,
            });
            setConvertOpen(false);
            setConverting(null);
            refresh();
          }}
        />
      )}

      {viewingIntake && (
        <IntakeDetail
          intake={viewingIntake}
          onClose={() => setViewingIntake(null)}
          onMarkReviewed={async () => {
            const { supabase } = await import("@/integrations/supabase/client");
            const { data: userRes } = await supabase.auth.getUser();
            await supabase
              .from("intake_forms")
              .update({ status: "reviewed", reviewed_by: userRes.user?.id ?? null, reviewed_at: new Date().toISOString() })
              .eq("id", viewingIntake.id);
            setViewingIntake(null);
            refresh();
          }}
        />
      )}
    </AppShell>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition " +
        (active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground")
      }
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-3 py-1 text-xs font-medium capitalize transition " +
        (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")
      }
    >
      {children}
    </button>
  );
}

function CountPill({ n }: { n: number }) {
  return <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{n}</span>;
}

function IntakeDetail({ intake, onClose, onMarkReviewed }: { intake: IntakeFormRow; onClose: () => void; onMarkReviewed: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card p-6 ring-1 ring-border">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{intake.full_name}</h2>
            <p className="text-xs text-muted-foreground">Submitted {new Date(intake.created_at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><XIcon className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 text-sm">
          <Section title="Contact">
            <Row k="Date of birth" v={intake.date_of_birth ?? "—"} />
            <Row k="Phone" v={intake.phone ?? "—"} />
            <Row k="Email" v={intake.email ?? "—"} />
            <Row k="Address" v={intake.address ?? "—"} />
            <Row k="Emergency" v={intake.emergency_contact_name ? `${intake.emergency_contact_name} · ${intake.emergency_contact_phone ?? ""}` : "—"} />
          </Section>
          <Section title="Medical history">
            <Row k="Allergies" v={intake.allergies.join(", ") || "—"} />
            <Row k="Conditions" v={intake.medical_conditions.join(", ") || "—"} />
            <Row k="Medications" v={intake.medications.join(", ") || "—"} />
          </Section>
          <Section title="Insurance">
            <Row k="Carrier" v={intake.insurance_carrier ?? "—"} />
            <Row k="Member ID" v={intake.insurance_member_id ?? "—"} />
            <Row k="Group" v={intake.insurance_group ?? "—"} />
          </Section>
          <Section title="Consents">
            <Row k="Treatment" v={intake.consent_treatment ? "Accepted" : "Not accepted"} />
            <Row k="Privacy (HIPAA)" v={intake.consent_privacy ? "Accepted" : "Not accepted"} />
            <Row k="Signature" v={intake.signature ? intake.signature + (intake.signed_at ? ` (${new Date(intake.signed_at).toLocaleDateString()})` : "") : "—"} />
          </Section>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <GhostButton onClick={onClose}>Close</GhostButton>
          {intake.status === "submitted" && (
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); try { await onMarkReviewed(); } finally { setBusy(false); } }}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Mark reviewed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="rounded-2xl bg-muted/40 p-3">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right text-foreground">{v}</span>
    </div>
  );
}
