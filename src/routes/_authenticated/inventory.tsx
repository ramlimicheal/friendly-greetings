import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { AppShell, Card, GhostButton, PrimaryButton, Pill, SectionHeader } from "@/components/app-shell";
import { inventory } from "@/lib/mock-data";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Enamel Dental Clinic" },
      { name: "description", content: "Track supplies, reorder points, and suppliers across the clinic." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const [q, setQ] = useState("");
  const filtered = inventory.filter(i => !q || i.name.toLowerCase().includes(q.toLowerCase()));
  const low = inventory.filter(i => i.onHand <= i.reorderAt);

  return (
    <AppShell
      title="Inventory"
      subtitle={`${inventory.length} SKUs · ${low.length} at or below reorder point`}
      actions={
        <>
          <GhostButton>Create PO</GhostButton>
          <PrimaryButton icon={Plus}>Add item</PrimaryButton>
        </>
      }
    >
      {low.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-900">{low.length} items need reordering</div>
            <div className="text-xs text-amber-800">
              {low.map(l => l.name).slice(0, 3).join(", ")}{low.length > 3 && ` and ${low.length - 3} more`}
            </div>
          </div>
          <button className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-medium text-white">Auto-order</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="!p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search supplies"
                className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_100px_100px_1fr_100px] gap-2 border-b border-border bg-muted/50 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <div>Item</div><div>Category</div><div className="text-right">On hand</div><div className="text-right">Reorder</div><div>Supplier</div><div className="text-right">Status</div>
            </div>
            {filtered.map((i) => {
              const isLow = i.onHand <= i.reorderAt;
              const pct = Math.min(100, (i.onHand / (i.reorderAt * 2)) * 100);
              return (
                <div key={i.id} className="grid grid-cols-[2fr_1fr_100px_100px_1fr_100px] items-center gap-2 border-b border-border px-6 py-3.5 text-sm last:border-b-0">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-muted">
                      <div className={"h-full rounded-full " + (isLow ? "bg-red-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-muted-foreground">{i.category}</div>
                  <div className={"text-right font-semibold " + (isLow ? "text-red-600" : "")}>{i.onHand}<span className="ml-1 font-normal text-muted-foreground">{i.unit}</span></div>
                  <div className="text-right text-muted-foreground">{i.reorderAt}</div>
                  <div className="text-muted-foreground">{i.supplier}</div>
                  <div className="flex justify-end">
                    <Pill tone={isLow ? "danger" : "success"}>{isLow ? "Low" : "OK"}</Pill>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="Low stock" icon={AlertTriangle} />
            <ul className="space-y-2">
              {low.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.onHand} of {l.reorderAt} · {l.supplier}</div>
                  </div>
                  <Pill tone="danger">Reorder</Pill>
                </li>
              ))}
              {low.length === 0 && <li className="text-sm text-muted-foreground">All items above threshold.</li>}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Top suppliers" icon={Package} />
            <ul className="space-y-3">
              {[
                { s: "Henry Schein", spend: 4820 },
                { s: "Patterson Dental", spend: 3140 },
                { s: "Benco", spend: 2260 },
                { s: "3M", spend: 1180 },
              ].map((s) => (
                <li key={s.s} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.s}</span>
                  <span className="text-muted-foreground">${s.spend.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
