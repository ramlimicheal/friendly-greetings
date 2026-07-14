// Printable HTML generators for statements and ADA claim forms.
// Opens in a new window and triggers print.

function openPrintable(title: string, html: string) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { alert("Please allow pop-ups to print."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111; margin: 0; padding: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #555; margin: 24px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e5e5; }
    th { background: #f7f7f7; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; color: #555; }
    .right { text-align: right; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #111; }
    .totals { margin-top: 16px; margin-left: auto; width: 320px; font-size: 13px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { border-top: 2px solid #111; margin-top: 8px; padding-top: 8px; font-weight: 700; font-size: 15px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; font-size: 12px; margin-top: 8px; }
    .label { font-size: 10px; text-transform: uppercase; color: #666; letter-spacing: .05em; }
    .box { border: 1px solid #999; padding: 8px 10px; border-radius: 4px; min-height: 34px; }
    .foot { margin-top: 40px; font-size: 11px; color: #666; text-align: center; }
    @media print { body { padding: 16px; } .no-print { display: none; } }
  </style>
  </head><body>${html}
  <div class="no-print" style="margin-top:24px;text-align:center">
    <button onclick="window.print()" style="padding:10px 24px;border-radius:20px;border:none;background:#111;color:#fff;font-weight:600;cursor:pointer">Print</button>
  </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.focus(), 100);
}

type InvoiceLike = {
  invoice_no: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number | string;
  insurance_estimate: number | string;
  patient_portion: number | string;
  amount_paid: number | string;
  notes?: string | null;
  patient: { full_name: string; chart_no: string; email?: string | null; phone?: string | null; address?: string | null };
  items: { procedure_code: string; description: string; tooth_number: number | null; surfaces: string | null; fee: number | string; category: string }[];
};

export function printStatement(inv: InvoiceLike, clinic = { name: "Enamel Dental Clinic", address: "123 Main St, Springfield", phone: "(555) 123-4567" }) {
  const balance = Number(inv.patient_portion) - Number(inv.amount_paid);
  const rows = inv.items.map((it) => `
    <tr>
      <td>${it.procedure_code}</td>
      <td>${escapeHtml(it.description)}</td>
      <td>${it.tooth_number ?? "—"}</td>
      <td>${escapeHtml(it.surfaces ?? "—")}</td>
      <td>${it.category}</td>
      <td class="right">$${Number(it.fee).toFixed(2)}</td>
    </tr>`).join("");

  const html = `
    <div class="header">
      <div>
        <h1>${clinic.name}</h1>
        <div style="font-size:12px;color:#555">${clinic.address}<br>${clinic.phone}</div>
      </div>
      <div style="text-align:right">
        <h1 style="color:#0a7">STATEMENT</h1>
        <div style="font-size:12px">#${inv.invoice_no} · Status: <b>${inv.status}</b></div>
      </div>
    </div>
    <div class="grid" style="margin-top:16px">
      <div>
        <div class="label">Bill to</div>
        <div><b>${escapeHtml(inv.patient.full_name)}</b> (Chart ${inv.patient.chart_no})</div>
        <div>${escapeHtml(inv.patient.address ?? "")}</div>
        <div>${escapeHtml(inv.patient.email ?? "")} · ${escapeHtml(inv.patient.phone ?? "")}</div>
      </div>
      <div>
        <div><span class="label">Issue date</span> · ${inv.issue_date}</div>
        <div><span class="label">Due date</span> · ${inv.due_date}</div>
      </div>
    </div>
    <h2>Services</h2>
    <table><thead><tr><th>Code</th><th>Description</th><th>Tooth</th><th>Surf.</th><th>Category</th><th class="right">Fee</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div><span>Subtotal</span><span>$${Number(inv.subtotal).toFixed(2)}</span></div>
      <div><span>Insurance estimate</span><span>−$${Number(inv.insurance_estimate).toFixed(2)}</span></div>
      <div><span>Patient portion</span><span>$${Number(inv.patient_portion).toFixed(2)}</span></div>
      <div><span>Payments received</span><span>−$${Number(inv.amount_paid).toFixed(2)}</span></div>
      <div class="grand"><span>Balance due</span><span>$${balance.toFixed(2)}</span></div>
    </div>
    ${inv.notes ? `<h2>Notes</h2><div style="font-size:12px">${escapeHtml(inv.notes)}</div>` : ""}
    <div class="foot">Thank you for choosing ${clinic.name}. Please remit payment by the due date shown above.</div>
  `;
  openPrintable(`Statement ${inv.invoice_no}`, html);
}

type ClaimLike = {
  claim_no: string;
  service_date: string;
  status: string;
  provider: string | null;
  diagnosis: string | null;
  narrative: string | null;
  billed_amount: number | string;
  patient: { full_name: string; chart_no: string; date_of_birth: string | null; sex: string | null; address?: string | null; phone?: string | null };
  plan: { payer_name: string; plan_name: string | null; group_number: string | null } | null;
  subscriber?: { name: string; member_id: string | null; relationship: string } | null;
  items: { procedure_code: string; description: string; tooth_number: number | null; surfaces: string | null; service_date: string | null; fee: number | string }[];
};

export function printAdaClaim(claim: ClaimLike, clinic = { name: "Enamel Dental Clinic", address: "123 Main St, Springfield", phone: "(555) 123-4567", npi: "1234567890", tin: "12-3456789" }) {
  const rows = claim.items.map((it, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${it.service_date ?? claim.service_date}</td>
      <td>${it.tooth_number ?? ""}</td>
      <td>${escapeHtml(it.surfaces ?? "")}</td>
      <td>${it.procedure_code}</td>
      <td>${escapeHtml(it.description)}</td>
      <td class="right">$${Number(it.fee).toFixed(2)}</td>
    </tr>`).join("");

  const html = `
    <div class="header">
      <div>
        <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.1em">ADA Dental Claim Form</div>
        <h1>Attending Dentist's Statement</h1>
      </div>
      <div style="text-align:right"><div style="font-size:11px;color:#666">Claim #</div><div style="font-size:16px;font-weight:700">${claim.claim_no}</div><div style="font-size:11px;margin-top:4px">Status: ${claim.status}</div></div>
    </div>

    <h2>1. Payer / Insurance</h2>
    <div class="grid">
      <div><div class="label">Payer name</div><div class="box">${escapeHtml(claim.plan?.payer_name ?? "")}</div></div>
      <div><div class="label">Plan / group</div><div class="box">${escapeHtml(claim.plan?.plan_name ?? "")} ${claim.plan?.group_number ? `· Group ${claim.plan.group_number}` : ""}</div></div>
    </div>

    <h2>2. Subscriber (Policyholder)</h2>
    <div class="grid">
      <div><div class="label">Subscriber name</div><div class="box">${escapeHtml(claim.subscriber?.name ?? claim.patient.full_name)}</div></div>
      <div><div class="label">Member ID</div><div class="box">${escapeHtml(claim.subscriber?.member_id ?? "")}</div></div>
      <div><div class="label">Relationship to patient</div><div class="box">${escapeHtml(claim.subscriber?.relationship ?? "self")}</div></div>
    </div>

    <h2>3. Patient</h2>
    <div class="grid">
      <div><div class="label">Name</div><div class="box">${escapeHtml(claim.patient.full_name)}</div></div>
      <div><div class="label">Chart #</div><div class="box">${claim.patient.chart_no}</div></div>
      <div><div class="label">Date of birth</div><div class="box">${claim.patient.date_of_birth ?? ""}</div></div>
      <div><div class="label">Sex</div><div class="box">${claim.patient.sex ?? ""}</div></div>
      <div style="grid-column:span 2"><div class="label">Address / phone</div><div class="box">${escapeHtml(claim.patient.address ?? "")} · ${escapeHtml(claim.patient.phone ?? "")}</div></div>
    </div>

    <h2>4. Record of services provided</h2>
    <table><thead><tr><th>#</th><th>Date</th><th>Tooth</th><th>Surf.</th><th>Code</th><th>Description</th><th class="right">Fee</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div class="grand"><span>Total fee</span><span>$${Number(claim.billed_amount).toFixed(2)}</span></div>
    </div>

    <h2>5. Diagnosis</h2>
    <div class="box" style="min-height:28px">${escapeHtml(claim.diagnosis ?? "")}</div>

    <h2>6. Remarks / narrative</h2>
    <div class="box" style="min-height:60px">${escapeHtml(claim.narrative ?? "")}</div>

    <h2>7. Billing dentist / office</h2>
    <div class="grid">
      <div><div class="label">Practice</div><div class="box">${clinic.name}</div></div>
      <div><div class="label">Attending dentist</div><div class="box">${escapeHtml(claim.provider ?? "")}</div></div>
      <div><div class="label">Address</div><div class="box">${clinic.address}</div></div>
      <div><div class="label">Phone</div><div class="box">${clinic.phone}</div></div>
      <div><div class="label">NPI</div><div class="box">${clinic.npi}</div></div>
      <div><div class="label">TIN</div><div class="box">${clinic.tin}</div></div>
    </div>

    <div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:32px">
      <div><div style="border-top:1px solid #333;padding-top:6px;font-size:11px">Signature of dentist · Date</div></div>
      <div><div style="border-top:1px solid #333;padding-top:6px;font-size:11px">Signature of subscriber · Date</div></div>
    </div>
    <div class="foot">This document is formatted to match the ADA J400/J430 dental claim layout for reference. Verify with the payer's preferred submission format.</div>
  `;
  openPrintable(`Claim ${claim.claim_no}`, html);
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
