import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Download } from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, Pill } from "@/components/app-shell";
import { PatientFormDialog } from "@/components/patient-form-dialog";
import {
  ageFromDob,
  createPatient,
  formatDate,
  initialsOf,
  listPatients,
  type PatientInsert,
  type PatientRow,
} from "@/lib/patients-api";

export const Route = createFileRoute("/_authenticated/patients/")({
  head: () => ({
    meta: [
      { title: "Patients — Enamel Dental Clinic" },
      { name: "description", content: "Search, filter, and manage your patient roster with balances and recall status." },
    ],
  }),
  component: PatientsPage,
});

const FILTERS = ["All", "Active", "New", "Recall", "Overdue"] as const;
type FilterKey = (typeof FILTERS)[number];

function PatientsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("All");
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ["patients"],
    queryFn: listPatients,
  });

  const createMut = useMutation({
    mutationFn: (input: PatientInsert) => createPatient(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (filter !== "All" && p.status !== filter) return false;
      if (q) {
        const term = q.toLowerCase();
        if (!(p.full_name.toLowerCase().includes(term) || p.chart_no.toLowerCase().includes(term))) return false;
      }
      return true;
    });
  }, [patients, filter, q]);

  const overdueCount = patients.filter((p) => p.status === "Overdue").length;
  const balanceCount = patients.filter((p) => Number(p.balance) > 0).length;

  return (
    <AppShell
      title="Patients"
      subtitle={
        isLoading
          ? "Loading…"
          : `${patients.length} total · ${overdueCount} overdue · ${balanceCount} with balance`
      }
      actions={
        <>
          <GhostButton icon={Download}>Export CSV</GhostButton>
          <PrimaryButton icon={Plus} onClick={() => setDialogOpen(true)}>New patient</PrimaryButton>
        </>
      }
    >
      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or chart #"
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-medium transition " +
                  (filter === f ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {f}
              </button>
            ))}
          </div>
          <GhostButton icon={Filter}>More filters</GhostButton>
        </div>
      </Card>

      <div className="mt-4">
        <Card className="!p-0 overflow-hidden">
          <div className="grid grid-cols-[1.6fr_0.8fr_1fr_1fr_1fr_0.8fr_0.6fr] gap-4 border-b border-border bg-muted/50 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <div>Patient</div>
            <div>Chart</div>
            <div>Last visit</div>
            <div>Next visit</div>
            <div>Insurance</div>
            <div>Balance</div>
            <div>Status</div>
          </div>
          {error ? (
            <div className="px-6 py-12 text-center text-sm text-destructive">
              Couldn't load patients: {error instanceof Error ? error.message : String(error)}
            </div>
          ) : isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading patients…</div>
          ) : (
            <ul>
              {filtered.map((p) => (
                <PatientRowItem key={p.id} p={p} />
              ))}
              {filtered.length === 0 && (
                <li className="px-6 py-12 text-center text-sm text-muted-foreground">
                  {patients.length === 0 ? "No patients yet — click New patient to add one." : "No patients match your filters."}
                </li>
              )}
            </ul>
          )}
        </Card>
      </div>

      <PatientFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={async (v) => {
          await createMut.mutateAsync(v);
        }}
      />
    </AppShell>
  );
}

function PatientRowItem({ p }: { p: PatientRow }) {
  const age = ageFromDob(p.date_of_birth);
  const balance = Number(p.balance);
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        to="/patients/$id"
        params={{ id: p.id }}
        className="grid grid-cols-[1.6fr_0.8fr_1fr_1fr_1fr_0.8fr_0.6fr] items-center gap-4 px-6 py-4 transition hover:bg-muted/40"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-accent-foreground">
            {initialsOf(p.full_name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{p.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {[age ? `${age} y` : null, p.sex, p.phone].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">{p.chart_no}</div>
        <div className="text-sm">{formatDate(p.last_visit_at)}</div>
        <div className="text-sm">{p.next_visit_at ? formatDate(p.next_visit_at) : <span className="text-muted-foreground">—</span>}</div>
        <div className="text-sm text-muted-foreground">{p.insurance ?? "—"}</div>
        <div className={"text-sm font-medium " + (balance > 0 ? "text-red-600" : "text-muted-foreground")}>
          {balance > 0 ? `$${balance.toFixed(2)}` : "$0"}
        </div>
        <div>
          <Pill tone={p.status === "Overdue" ? "danger" : p.status === "Recall" ? "warn" : p.status === "New" ? "info" : "success"}>
            {p.status}
          </Pill>
        </div>
      </Link>
    </li>
  );
}
