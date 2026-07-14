import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Shield,
  Calendar,
  FileText,
  DollarSign,
  AlertTriangle,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, Pill, SectionHeader } from "@/components/app-shell";
import { PatientFormDialog } from "@/components/patient-form-dialog";
import {
  ageFromDob,
  deletePatient,
  formatDate,
  getPatient,
  initialsOf,
  updatePatient,
  type PatientInsert,
  type PatientRow,
} from "@/lib/patients-api";
import { Odontogram } from "@/components/odontogram";

export const Route = createFileRoute("/_authenticated/patients/$id")({
  head: () => ({
    meta: [{ title: "Patient Chart — Enamel" }],
  }),
  component: PatientDetail,
  notFoundComponent: () => (
    <AppShell title="Patient not found">
      <Card>
        <p className="text-sm text-muted-foreground">We couldn't find that patient.</p>
        <div className="mt-4">
          <Link to="/patients" className="text-sm font-medium text-primary hover:underline">← Back to patients</Link>
        </div>
      </Card>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Something went wrong">
      <Card>
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load patient."}</p>
      </Card>
    </AppShell>
  ),
});

type Tab = "overview" | "chart" | "plan" | "history" | "billing";

function PatientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
  });

  const updateMut = useMutation({
    mutationFn: (v: PatientInsert) => updatePatient(id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient", id] });
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deletePatient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      navigate({ to: "/patients" });
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Loading…">
        <Card><p className="text-sm text-muted-foreground">Loading patient…</p></Card>
      </AppShell>
    );
  }
  if (error) throw error;
  if (!patient) throw notFound();

  const age = ageFromDob(patient.date_of_birth);
  const balance = Number(patient.balance);

  return (
    <AppShell
      title={patient.full_name}
      subtitle={`${patient.chart_no}${age != null ? ` · ${age} y/o` : ""}${patient.sex ? ` · ${patient.sex}` : ""}${patient.primary_dentist ? ` · Primary: ${patient.primary_dentist}` : ""}`}
      actions={
        <>
          <Link to="/patients" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All patients
          </Link>
          <GhostButton icon={Pencil} onClick={() => setEditOpen(true)}>Edit</GhostButton>
          <GhostButton icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete</GhostButton>
          <GhostButton icon={MessageSquare}>Message</GhostButton>
          <PrimaryButton icon={Plus}>Book appointment</PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        {/* left rail */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-lg font-semibold text-accent-foreground">
                {initialsOf(patient.full_name)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{patient.full_name}</div>
                <div className="text-xs text-muted-foreground">{patient.chart_no}</div>
                <div className="mt-1">
                  <Pill tone={patient.status === "Overdue" ? "danger" : patient.status === "Recall" ? "warn" : patient.status === "New" ? "info" : "success"}>
                    {patient.status}
                  </Pill>
                </div>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              <Info icon={Phone} label={patient.phone ?? "No phone"} />
              <Info icon={Mail} label={patient.email ?? "No email"} />
              <Info icon={MapPin} label={patient.address ?? "No address"} />
              <Info icon={Shield} label={patient.insurance ?? "No insurance on file"} />
              <Info icon={Calendar} label={`Next: ${patient.next_visit_at ? formatDate(patient.next_visit_at) : "not scheduled"}`} />
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Alerts" icon={AlertTriangle} />
            {patient.allergies && patient.allergies.length > 0 ? (
              <ul className="space-y-2">
                {patient.allergies.map((a) => (
                  <li key={a} className="flex items-center justify-between rounded-2xl bg-red-50 px-3 py-2 text-sm ring-1 ring-red-100">
                    <span className="font-medium text-red-700">Allergy · {a}</span>
                    <Pill tone="danger">Avoid</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No known allergies on file.</p>
            )}
            {patient.notes && (
              <div className="mt-3 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
                {patient.notes}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader title="Balance" icon={DollarSign} />
            <div className="text-3xl font-semibold">${balance.toFixed(2)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {balance > 0 ? "Outstanding — send statement?" : "Account in good standing."}
            </p>
          </Card>

          <PatientRecalls patientId={patient.id} />
        </div>

        {/* right main */}
        <div>
          <Card className="!p-0 overflow-hidden">
            <div className="flex gap-1 border-b border-border bg-muted/40 p-2">
              {(["overview","chart","plan","history","billing"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    "rounded-full px-4 py-1.5 text-sm font-medium transition capitalize " +
                    (tab === t ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "chart" ? "Odontogram" : t}
                </button>
              ))}
            </div>
            <div className="p-6">
              {tab === "overview" && <OverviewTab patient={patient} />}
              {tab === "chart" && <Odontogram patientId={patient.id} />}
              {tab === "plan" && <ComingSoon what="Treatment plan" />}
              {tab === "history" && <ComingSoon what="Clinical history" />}
              {tab === "billing" && <ComingSoon what="Billing" />}
            </div>
          </Card>
        </div>
      </div>

      <PatientFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={patient}
        title="Edit patient"
        onSubmit={async (v) => {
          await updateMut.mutateAsync(v);
        }}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 ring-1 ring-border">
            <h3 className="text-base font-semibold">Delete this patient?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently remove {patient.full_name} ({patient.chart_no}) and cannot be undone. Only admins and dentists can delete patients.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
              >
                {deleteMut.isPending ? "Deleting…" : "Delete patient"}
              </button>
            </div>
            {deleteMut.error && (
              <p className="mt-3 text-xs text-destructive">
                {deleteMut.error instanceof Error ? deleteMut.error.message : "Failed to delete"}
              </p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Info({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <span className="min-w-0 break-words">{label}</span>
    </li>
  );
}

function OverviewTab({ patient }: { patient: PatientRow }) {
  const items = [
    { t: "Chart #", v: patient.chart_no },
    { t: "Primary dentist", v: patient.primary_dentist ?? "—" },
    { t: "Insurance", v: patient.insurance ?? "—" },
    { t: "Last visit", v: formatDate(patient.last_visit_at) },
    { t: "Next visit", v: formatDate(patient.next_visit_at) },
    { t: "Added", v: formatDate(patient.created_at) },
  ];
  return (
    <div>
      <SectionHeader title="Overview" icon={FileText} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.t} className="rounded-2xl bg-muted/60 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{it.t}</div>
            <div className="mt-1 text-sm font-medium">{it.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({ what }: { what: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-8 text-center">
      <div className="text-sm font-medium">{what} is coming next</div>
      <p className="mt-1 text-xs text-muted-foreground">
        We'll wire this to the database in an upcoming slice.
      </p>
    </div>
  );
}


// ============= Patient Recalls Card =============
import { useEffect } from "react";
import { RefreshCcw, CheckCircle2 } from "lucide-react";
import { RecallFormDialog } from "@/components/recall-form-dialog";
import { listRecallsForPatient, createRecall, updateRecall, deleteRecall, completeRecall, type RecallRow, type RecallInsert } from "@/lib/recalls-api";

function PatientRecalls({ patientId }: { patientId: string }) {
  const [recalls, setRecalls] = useState<RecallRow[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; editing: RecallRow | null }>({ open: false, editing: null });

  const load = async () => setRecalls(await listRecallsForPatient(patientId));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId]);

  const save = async (v: RecallInsert) => {
    if (dialog.editing) await updateRecall(dialog.editing.id, v);
    else await createRecall(v);
    await load();
  };
  const del = async () => { if (dialog.editing) { await deleteRecall(dialog.editing.id); await load(); } };
  const done = async (r: RecallRow) => { await completeRecall(r.id, r.interval_months); await load(); };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionHeader title="Recalls" icon={RefreshCcw} />
        <GhostButton icon={Plus} onClick={() => setDialog({ open: true, editing: null })}>Add</GhostButton>
      </div>
      {recalls.length === 0 ? (
        <p className="text-xs text-muted-foreground">No recalls set up.</p>
      ) : (
        <ul className="space-y-2">
          {recalls.map((r) => {
            const overdue = new Date(r.next_due_at) <= new Date();
            return (
              <li key={r.id} className="rounded-xl border border-border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.procedure}</div>
                    <div className="text-[11px] text-muted-foreground">Every {r.interval_months} mo · Next: <span className={overdue ? "font-semibold text-red-700" : ""}>{r.next_due_at}</span></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => done(r)} title="Mark done" className="rounded-full border border-border p-1.5 hover:bg-muted"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></button>
                    <button onClick={() => setDialog({ open: true, editing: r })} title="Edit" className="rounded-full border border-border p-1.5 hover:bg-muted"><Pencil className="h-3 w-3" /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <RecallFormDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, editing: null })}
        onSubmit={save}
        onDelete={dialog.editing ? del : undefined}
        initial={dialog.editing}
        patient_id={patientId}
      />
    </Card>
  );
}
