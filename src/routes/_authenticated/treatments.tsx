import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Stethoscope } from "lucide-react";
import { AppShell, Card, PrimaryButton, Pill, SectionHeader } from "@/components/app-shell";
import { treatmentCatalog } from "@/lib/mock-data";

export const Route = createFileRoute("/treatments")({
  head: () => ({
    meta: [
      { title: "Treatments — Enamel Dental Clinic" },
      { name: "description", content: "Procedure catalog with ADA codes, fees, and duration. Manage active treatment plans." },
    ],
  }),
  component: TreatmentsPage,
});

function TreatmentsPage() {
  const [q, setQ] = useState("");
  const categories = Array.from(new Set(treatmentCatalog.map((t) => t.category)));
  const [cat, setCat] = useState<string>("All");
  const filtered = treatmentCatalog.filter((t) => {
    if (cat !== "All" && t.category !== cat) return false;
    if (q && !(t.name.toLowerCase().includes(q.toLowerCase()) || t.code.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <AppShell
      title="Treatments"
      subtitle={`${treatmentCatalog.length} procedures across ${categories.length} categories`}
      actions={<PrimaryButton icon={Plus}>Add procedure</PrimaryButton>}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="!p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search code or name"
                  className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {["All", ...categories].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={
                      "rounded-full px-3 py-1.5 text-xs font-medium transition " +
                      (cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="grid grid-cols-[100px_1.5fr_1fr_100px_100px] gap-2 border-b border-border bg-muted/50 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <div>Code</div><div>Procedure</div><div>Category</div><div className="text-right">Duration</div><div className="text-right">Fee</div>
            </div>
            {filtered.map((t) => (
              <div key={t.code} className="grid grid-cols-[100px_1.5fr_1fr_100px_100px] items-center gap-2 border-b border-border px-6 py-3.5 text-sm last:border-b-0">
                <div className="font-medium text-muted-foreground">{t.code}</div>
                <div className="font-medium">{t.name}</div>
                <div><Pill tone="info">{t.category}</Pill></div>
                <div className="text-right text-muted-foreground">{t.duration} min</div>
                <div className="text-right font-semibold">${t.fee}</div>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="Active plans" icon={Stethoscope} />
            <ul className="space-y-3">
              {[
                { name: "Marcus Delaney", phase: "Phase 2 · 60%", value: 3820 },
                { name: "Priya Natarajan", phase: "Invisalign · tray 12/22", value: 5400 },
                { name: "Amelia Chen", phase: "Phase 2 · 20%", value: 1670 },
                { name: "James Wong", phase: "Perio maintenance", value: 285 },
              ].map((p) => (
                <li key={p.name} className="rounded-2xl bg-muted/60 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-sm font-semibold">${p.value.toLocaleString()}</div>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{p.phase}</div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Top procedures this month" />
            <ul className="space-y-3">
              {[
                { name: "Prophylaxis", count: 62, pct: 100 },
                { name: "Composite restorations", count: 38, pct: 61 },
                { name: "Bitewing X-rays", count: 27, pct: 43 },
                { name: "Crowns", count: 9, pct: 14 },
                { name: "Root canals", count: 6, pct: 10 },
              ].map((p) => (
                <li key={p.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
