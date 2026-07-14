import { createFileRoute } from "@tanstack/react-router";
import { Plus, Download, DollarSign, ArrowUpRight } from "lucide-react";
import { AppShell, Card, GhostButton, PrimaryButton, Pill, SectionHeader } from "@/components/app-shell";
import { invoices } from "@/lib/mock-data";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Enamel Dental Clinic" },
      { name: "description", content: "Invoices, insurance claims, and accounts receivable at a glance." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const paid = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const pending = invoices.filter(i => i.status === "Pending" || i.status === "Partial").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <AppShell
      title="Billing"
      subtitle="Invoices, claims, and receivables — October 2025"
      actions={
        <>
          <GhostButton icon={Download}>Export</GhostButton>
          <PrimaryButton icon={Plus}>New invoice</PrimaryButton>
        </>
      }
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MoneyCard label="Collected" value={paid} tone="primary" hint="Cleared this month" />
        <MoneyCard label="Pending" value={pending} tone="warn" hint="Awaiting payment or claim" />
        <MoneyCard label="Overdue" value={overdue} tone="danger" hint="Follow up required" />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <SectionHeader title="Recent invoices" icon={DollarSign} />
          </div>
          <div className="grid grid-cols-[110px_1fr_1fr_120px_120px_120px] gap-2 border-b border-t border-border bg-muted/40 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <div>Invoice</div><div>Patient</div><div>Items</div><div>Date</div><div className="text-right">Amount</div><div className="text-right">Status</div>
          </div>
          {invoices.map((i) => (
            <div key={i.id} className="grid grid-cols-[110px_1fr_1fr_120px_120px_120px] items-center gap-2 border-b border-border px-6 py-3.5 text-sm last:border-b-0">
              <div className="font-medium">{i.id}</div>
              <div className="font-medium">{i.patient}</div>
              <div className="truncate text-muted-foreground">{i.items}</div>
              <div>{i.date}</div>
              <div className="text-right font-semibold">${i.amount}</div>
              <div className="flex justify-end">
                <Pill tone={i.status === "Paid" ? "success" : i.status === "Overdue" ? "danger" : i.status === "Partial" ? "warn" : "muted"}>{i.status}</Pill>
              </div>
            </div>
          ))}
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="Insurance claims" />
            <ul className="space-y-3">
              {[
                { payer: "Delta PPO", n: 12, amt: 4820, status: "In review" },
                { payer: "Cigna", n: 7, amt: 3120, status: "Paid" },
                { payer: "MetLife", n: 5, amt: 2180, status: "Awaiting EOB" },
                { payer: "Aetna", n: 3, amt: 1440, status: "Paid" },
              ].map((c) => (
                <li key={c.payer} className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{c.payer}</div>
                    <div className="text-xs text-muted-foreground">{c.n} claims · ${c.amt.toLocaleString()}</div>
                  </div>
                  <Pill tone={c.status === "Paid" ? "success" : "info"}>{c.status}</Pill>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="A/R aging" />
            <ul className="space-y-3">
              {[
                { b: "0–30 days", v: 2840, pct: 62 },
                { b: "31–60 days", v: 1120, pct: 24 },
                { b: "61–90 days", v: 480, pct: 10 },
                { b: "90+ days", v: 180, pct: 4 },
              ].map((r) => (
                <li key={r.b}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{r.b}</span>
                    <span className="text-muted-foreground">${r.v.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
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

function MoneyCard({ label, value, tone, hint }: { label: string; value: number; tone: "primary" | "warn" | "danger"; hint: string }) {
  const toneMap = {
    primary: "bg-primary-soft text-accent-foreground",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={"flex h-8 w-8 items-center justify-center rounded-full " + toneMap[tone]}>
            <DollarSign className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-4xl font-semibold tracking-tight">${value.toLocaleString()}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}
