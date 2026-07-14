import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Filter, Download } from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, Pill } from "@/components/app-shell";
import { patients } from "@/lib/mock-data";

export const Route = createFileRoute("/patients/")({
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
  const [filter, setFilter] = useState<FilterKey>("All");
  const [q, setQ] = useState("");
  const filtered = patients.filter((p) => {
    if (filter !== "All" && p.status !== filter) return false;
    if (q && !(p.name.toLowerCase().includes(q.toLowerCase()) || p.chartNo.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <AppShell
      title="Patients"
      subtitle={`${patients.length} total · ${patients.filter(p => p.status === "Overdue").length} overdue · ${patients.filter(p => p.balance > 0).length} with balance`}
      actions={
        <>
          <GhostButton icon={Download}>Export CSV</GhostButton>
          <PrimaryButton icon={Plus}>New patient</PrimaryButton>
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
                  (filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
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
          <ul>
            {filtered.map((p) => (
              <li key={p.id} className="border-b border-border last:border-b-0">
                <Link
                  to="/patients/$id"
                  params={{ id: p.id }}
                  className="grid grid-cols-[1.6fr_0.8fr_1fr_1fr_1fr_0.8fr_0.6fr] items-center gap-4 px-6 py-4 transition hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-accent-foreground">
                      {p.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.age} · {p.sex} · {p.phone}</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{p.chartNo}</div>
                  <div className="text-sm">{p.lastVisit}</div>
                  <div className="text-sm">{p.nextVisit ?? <span className="text-muted-foreground">—</span>}</div>
                  <div className="text-sm text-muted-foreground">{p.insurance}</div>
                  <div className={"text-sm font-medium " + (p.balance > 0 ? "text-red-600" : "text-muted-foreground")}>
                    {p.balance > 0 ? `$${p.balance}` : "$0"}
                  </div>
                  <div>
                    <Pill tone={p.status === "Overdue" ? "danger" : p.status === "Recall" ? "warn" : p.status === "New" ? "info" : "success"}>
                      {p.status}
                    </Pill>
                  </div>
                </Link>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-6 py-12 text-center text-sm text-muted-foreground">No patients match your filters.</li>
            )}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
