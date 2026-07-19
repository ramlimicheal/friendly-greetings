import { createFileRoute } from "@tanstack/react-router";
import { useRequirePermission } from "@/hooks/use-permissions";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, DollarSign, FileText, ShieldCheck, Receipt, Printer, Edit3, Wallet, AlertCircle, ArrowDownRight, Sparkles } from "lucide-react";
import { BenefitsExtractorDialog } from "@/components/benefits-extractor-dialog";

import { AppShell, Card, GhostButton, PrimaryButton, Pill, SectionHeader } from "@/components/app-shell";
import {
  agingBuckets,
  createClaim,
  createInvoice,
  deleteClaim,
  deleteInvoice,
  getClaim,
  getInvoice,
  listClaims,
  listInsurancePlans,
  listInvoices,
  listPayments,
  recordPayment,
  updateClaim,
  updateInvoice,
  refreshPatientBalance,
  estimate,
  coveragePct,
  CATEGORIES,
  type InvoiceRow,
  type ClaimRow,
} from "@/lib/billing-api";
import { listPatients } from "@/lib/patients-api";
import { InvoiceFormDialog } from "@/components/invoice-form-dialog";
import { PaymentDialog } from "@/components/payment-dialog";
import { ClaimFormDialog } from "@/components/claim-form-dialog";
import { printAdaClaim, printStatement } from "@/lib/billing-print";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Enamel Dental Clinic" },
      { name: "description", content: "Patient ledger, invoices, insurance claims, A/R aging, and coverage estimator." },
    ],
  }),
  component: BillingPage,
});

type Tab = "invoices" | "payments" | "claims" | "estimator" | "aging";

function BillingPage() {
  useRequirePermission(["billing.view","billing.manage","claims.manage"] as const);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("invoices");
  const [invoiceDialog, setInvoiceDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [payDialog, setPayDialog] = useState<{ open: boolean; invoiceId?: string | null }>({ open: false });
  const [claimDialog, setClaimDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [aiOpen, setAiOpen] = useState(false);


  const patientsQ = useQuery({ queryKey: ["patients"], queryFn: listPatients });
  const invoicesQ = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices() });
  const paymentsQ = useQuery({ queryKey: ["payments"], queryFn: () => listPayments() });
  const claimsQ = useQuery({ queryKey: ["claims"], queryFn: () => listClaims() });
  const plansQ = useQuery({ queryKey: ["insurance_plans"], queryFn: listInsurancePlans });

  const invoices = invoicesQ.data ?? [];
  const payments = paymentsQ.data ?? [];
  const claims = claimsQ.data ?? [];
  const patients = patientsQ.data ?? [];
  const plans = plansQ.data ?? [];

  const stats = useMemo(() => {
    const outstanding = invoices.reduce((s, i: any) => s + (i.status === "void" ? 0 : Number(i.patient_portion) - Number(i.amount_paid)), 0);
    const collected = invoices.reduce((s, i: any) => s + Number(i.amount_paid), 0);
    const overdue = invoices
      .filter((i: any) => i.status !== "paid" && i.status !== "void" && new Date(i.due_date) < new Date())
      .reduce((s, i: any) => s + (Number(i.patient_portion) - Number(i.amount_paid)), 0);
    const inClaims = claims
      .filter((c: any) => c.status === "submitted" || c.status === "in_review")
      .reduce((s, c: any) => s + Number(c.billed_amount), 0);
    return { outstanding, collected, overdue, inClaims };
  }, [invoices, claims]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["claims"] });
    qc.invalidateQueries({ queryKey: ["patients"] });
  };

  const openEditInvoice = async (id: string) => {
    const full = await getInvoice(id);
    setInvoiceDialog({ open: true, editing: full });
  };
  const openEditClaim = async (id: string) => {
    const full = await getClaim(id);
    setClaimDialog({ open: true, editing: full });
  };

  return (
    <AppShell
      title="Billing"
      subtitle="Invoices, payments, insurance claims, and receivables"
      actions={
        <>
          <button onClick={() => setAiOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5" /> AI benefits
          </button>
          <GhostButton icon={Wallet} onClick={() => setPayDialog({ open: true })}>Record payment</GhostButton>
          <GhostButton icon={FileText} onClick={() => setClaimDialog({ open: true })}>New claim</GhostButton>
          <PrimaryButton icon={Plus} onClick={() => setInvoiceDialog({ open: true })}>New invoice</PrimaryButton>
        </>
      }

    >
      {/* Summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <MoneyCard label="Collected" value={stats.collected} tone="primary" icon={DollarSign} />
        <MoneyCard label="Outstanding" value={stats.outstanding} tone="warn" icon={AlertCircle} />
        <MoneyCard label="Overdue" value={stats.overdue} tone="danger" icon={ArrowDownRight} />
        <MoneyCard label="In claims review" value={stats.inClaims} tone="info" icon={ShieldCheck} />
      </section>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-border">
        {(["invoices", "payments", "claims", "estimator", "aging"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative px-4 py-2.5 text-sm font-medium capitalize ${tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "invoices" && (
          <Card className="!p-0 overflow-hidden">
            <div className="grid grid-cols-[110px_1fr_1fr_120px_110px_110px_110px_90px] gap-2 border-b border-border bg-muted/40 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <div>Invoice</div><div>Patient</div><div>Notes</div><div>Issued</div><div className="text-right">Patient</div><div className="text-right">Paid</div><div className="text-right">Balance</div><div className="text-right">Actions</div>
            </div>
            {invoices.length === 0 ? (
              <EmptyState msg="No invoices yet." />
            ) : invoices.map((i: any) => {
              const balance = Number(i.patient_portion) - Number(i.amount_paid);
              return (
                <div key={i.id} className="grid grid-cols-[110px_1fr_1fr_120px_110px_110px_110px_90px] items-center gap-2 border-b border-border px-6 py-3 text-sm last:border-b-0">
                  <div className="font-medium">{i.invoice_no}</div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{i.patient?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{i.patient?.chart_no}</div>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{i.notes ?? "—"}</div>
                  <div className="text-xs">{i.issue_date}<div className="text-[11px] text-muted-foreground">due {i.due_date}</div></div>
                  <div className="text-right font-semibold">${Number(i.patient_portion).toFixed(2)}</div>
                  <div className="text-right text-primary">${Number(i.amount_paid).toFixed(2)}</div>
                  <div className="text-right"><Pill tone={balance <= 0 ? "success" : i.status === "overdue" ? "danger" : "warn"}>${balance.toFixed(2)}</Pill></div>
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn title="Record payment" onClick={() => setPayDialog({ open: true, invoiceId: i.id })}><Wallet className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Print statement" onClick={async () => { const full = await getInvoice(i.id); printStatement({ ...full, items: full.items } as any); }}><Printer className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Edit" onClick={() => openEditInvoice(i.id)}><Edit3 className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {tab === "payments" && (
          <Card className="!p-0 overflow-hidden">
            <div className="grid grid-cols-[110px_1fr_120px_120px_140px_1fr] gap-2 border-b border-border bg-muted/40 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <div>Date</div><div>Patient</div><div>Invoice</div><div className="text-right">Amount</div><div>Method</div><div>Reference / notes</div>
            </div>
            {payments.length === 0 ? <EmptyState msg="No payments recorded yet." /> : payments.map((p: any) => (
              <div key={p.id} className="grid grid-cols-[110px_1fr_120px_120px_140px_1fr] items-center gap-2 border-b border-border px-6 py-3 text-sm last:border-b-0">
                <div>{p.received_on}</div>
                <div className="truncate font-medium">{p.patient?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{p.invoice?.invoice_no ?? "Unapplied"}</div>
                <div className="text-right font-semibold text-primary">${Number(p.amount).toFixed(2)}</div>
                <div><Pill tone="info">{p.method}</Pill></div>
                <div className="truncate text-xs text-muted-foreground">{p.reference ?? ""} {p.notes ? `· ${p.notes}` : ""}</div>
              </div>
            ))}
          </Card>
        )}

        {tab === "claims" && (
          <Card className="!p-0 overflow-hidden">
            <div className="grid grid-cols-[110px_1fr_1fr_110px_110px_110px_110px_120px] gap-2 border-b border-border bg-muted/40 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <div>Claim #</div><div>Patient</div><div>Payer</div><div>Service</div><div className="text-right">Billed</div><div className="text-right">Paid</div><div>Status</div><div className="text-right">Actions</div>
            </div>
            {claims.length === 0 ? <EmptyState msg="No claims yet." /> : claims.map((c: any) => (
              <div key={c.id} className="grid grid-cols-[110px_1fr_1fr_110px_110px_110px_110px_120px] items-center gap-2 border-b border-border px-6 py-3 text-sm last:border-b-0">
                <div className="font-medium">{c.claim_no}</div>
                <div className="truncate font-medium">{c.patient?.full_name ?? "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{c.plan?.payer_name ?? "—"}{c.plan?.plan_name ? ` · ${c.plan.plan_name}` : ""}</div>
                <div className="text-xs">{c.service_date}</div>
                <div className="text-right font-semibold">${Number(c.billed_amount).toFixed(2)}</div>
                <div className="text-right text-primary">${Number(c.paid_amount).toFixed(2)}</div>
                <div><Pill tone={c.status === "paid" ? "success" : c.status === "denied" ? "danger" : "info"}>{c.status}</Pill></div>
                <div className="flex items-center justify-end gap-1">
                  <IconBtn title="Print ADA form" onClick={async () => { const full = await getClaim(c.id); printAdaClaim({ ...full, items: full.items } as any); }}><Printer className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Edit" onClick={() => openEditClaim(c.id)}><Edit3 className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </div>
            ))}
          </Card>
        )}

        {tab === "estimator" && <CoverageEstimator plans={plans} />}

        {tab === "aging" && (
          <AgingReport invoices={invoices as any} />
        )}
      </div>

      <InvoiceFormDialog
        open={invoiceDialog.open}
        onClose={() => setInvoiceDialog({ open: false })}
        initial={invoiceDialog.editing}
        patients={patients}
        plans={plans}
        onSubmit={async (inv, items) => {
          if (invoiceDialog.editing) {
            await updateInvoice(invoiceDialog.editing.id, {
              patient_id: inv.patient_id,
              issue_date: inv.issue_date,
              due_date: inv.due_date,
              status: inv.status,
              notes: inv.notes,
            });
          } else {
            await createInvoice(inv, items);
          }
          await refreshPatientBalance(inv.patient_id);
          invalidate();
        }}
        onDelete={invoiceDialog.editing ? async () => { await deleteInvoice(invoiceDialog.editing.id); await refreshPatientBalance(invoiceDialog.editing.patient_id); invalidate(); } : undefined}
      />

      <PaymentDialog
        open={payDialog.open}
        onClose={() => setPayDialog({ open: false })}
        patients={patients}
        invoices={invoices as any}
        defaultInvoiceId={payDialog.invoiceId}
        onSubmit={async (p) => { await recordPayment(p); invalidate(); }}
      />

      <ClaimFormDialog
        open={claimDialog.open}
        onClose={() => setClaimDialog({ open: false })}
        patients={patients}
        plans={plans}
        initial={claimDialog.editing}
        onSubmit={async (c, items) => {
          if (claimDialog.editing) {
            await updateClaim(claimDialog.editing.id, {
              patient_id: c.patient_id, plan_id: c.plan_id, service_date: c.service_date, provider: c.provider,
              status: c.status, diagnosis: c.diagnosis, narrative: c.narrative,
            });
          } else {
            await createClaim(c, items);
          }
          invalidate();
        }}
        onDelete={claimDialog.editing ? async () => { await deleteClaim(claimDialog.editing.id); invalidate(); } : undefined}
      />

      <BenefitsExtractorDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["insurance_plans"] })}
      />
    </AppShell>

  );
}

function MoneyCard({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "primary" | "warn" | "danger" | "info"; icon: any }) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary-soft text-accent-foreground",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-800",
  };
  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className={"flex h-8 w-8 items-center justify-center rounded-full " + toneMap[tone]}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </Card>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="px-6 py-10 text-center text-sm text-muted-foreground">{msg}</div>;
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return <button title={title} onClick={onClick} className="rounded-full border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">{children}</button>;
}

function AgingReport({ invoices }: { invoices: any[] }) {
  const buckets = agingBuckets(invoices);
  const total = Object.values(buckets).reduce((s, v) => s + v, 0);
  const rows = Object.entries(buckets).map(([b, v]) => ({ b, v, pct: total > 0 ? (v / total) * 100 : 0 }));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
      <Card>
        <SectionHeader title="A/R aging" />
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.b}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{r.b} days</span>
                <span className="text-muted-foreground">${r.v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${r.b === "90+" ? "bg-red-500" : r.b === "61-90" ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${r.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-border pt-3 text-sm">
          <div className="flex justify-between font-semibold"><span>Total outstanding</span><span>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        </div>
      </Card>
      <Card>
        <SectionHeader title="Overdue invoices" />
        {invoices.filter((i) => i.status !== "paid" && i.status !== "void" && new Date(i.due_date) < new Date()).length === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue invoices. 🎉</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {invoices
              .filter((i) => i.status !== "paid" && i.status !== "void" && new Date(i.due_date) < new Date())
              .map((i) => {
                const days = Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000);
                const bal = Number(i.patient_portion) - Number(i.amount_paid);
                return (
                  <li key={i.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                    <div>
                      <div className="font-medium">{i.invoice_no} · {i.patient?.full_name}</div>
                      <div className="text-xs text-muted-foreground">Due {i.due_date} · {days}d late</div>
                    </div>
                    <div className="text-sm font-semibold text-destructive">${bal.toFixed(2)}</div>
                  </li>
                );
              })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CoverageEstimator({ plans }: { plans: any[] }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [used, setUsed] = useState(0);
  const [items, setItems] = useState([
    { procedure_code: "D1110", description: "Adult prophy", category: "preventive", fee: 120 },
    { procedure_code: "D2392", description: "Composite 2-surface", category: "basic", fee: 240 },
  ]);
  const plan = plans.find((p) => p.id === planId);
  const est = estimate(plan, used, items);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <SectionHeader title="Estimate patient portion" icon={Receipt} />
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Insurance plan</span>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">— No plan —</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.payer_name}{p.plan_name ? ` · ${p.plan_name}` : ""}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Benefits already used this year</span>
            <input type="number" value={used} onChange={(e) => setUsed(Number(e.target.value))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
        </div>
        <div className="rounded-2xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-xs uppercase text-muted-foreground">Procedures</div>
            <button className="rounded-full border border-border px-2 py-1 text-xs hover:bg-muted" onClick={() => setItems([...items, { procedure_code: "D0000", description: "", category: "preventive", fee: 0 }])}>+ Add</button>
          </div>
          <div className="divide-y divide-border">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                <input value={it.procedure_code} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, procedure_code: e.target.value.toUpperCase() } : x))} className={itemInput + " col-span-2"} />
                <input value={it.description} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} className={itemInput + " col-span-5"} placeholder="Description" />
                <select value={it.category} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, category: e.target.value } : x))} className={itemInput + " col-span-2"}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={it.fee} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, fee: Number(e.target.value) } : x))} className={itemInput + " col-span-2 text-right"} />
                <div className="col-span-1 flex items-center justify-end text-xs text-muted-foreground">{plan ? `${coveragePct(plan, it.category)}%` : "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card>
        <SectionHeader title="Breakdown" />
        <dl className="space-y-2 text-sm">
          <Row label="Subtotal" value={`$${est.subtotal.toFixed(2)}`} />
          <Row label="Insurance covers" value={`−$${est.insurance.toFixed(2)}`} />
          <div className="border-t border-border pt-3">
            <Row label="Patient owes" value={`$${est.patient.toFixed(2)}`} strong />
          </div>
          {plan && <>
            <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Annual maximum</span><span>${Number(plan.annual_maximum).toFixed(0)}</span></div>
              <div className="flex justify-between"><span>Used to date</span><span>${used.toFixed(0)}</span></div>
              <div className="flex justify-between"><span>Remaining benefit</span><span>${est.remainingBenefit.toFixed(0)}</span></div>
              <div className="flex justify-between"><span>Deductible</span><span>${Number(plan.deductible).toFixed(0)}</span></div>
            </div>
          </>}
        </dl>
      </Card>
    </div>
  );
}

const itemInput = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "text-lg font-semibold" : ""}>{value}</span>
    </div>
  );
}
