import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callGateway(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const body: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    messages,
  };
  if (opts?.json) body.response_format = { type: "json_object" };
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in your workspace.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("AI returned an empty response");
  return content;
}

function extractJson<T>(raw: string): T {
  // Handle fenced code blocks and stray prose.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const cleaned = (fenced ? fenced[1] : raw).trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  const slice = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  return JSON.parse(slice) as T;
}

// ============= 1. SOAP dictation → structured note =============

export type SoapDraft = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export const draftSoapNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { transcript: string; context?: string }) => {
    const transcript = String(input.transcript ?? "").trim();
    if (transcript.length < 5) throw new Error("Transcript too short");
    if (transcript.length > 8000) throw new Error("Transcript too long (8000 char max)");
    return { transcript, context: String(input.context ?? "").slice(0, 500) };
  })
  .handler(async ({ data }): Promise<SoapDraft> => {
    const system = [
      "You are a dental clinical scribe. Convert a dentist's dictated visit notes",
      "into a concise structured SOAP note. Output ONLY valid JSON matching:",
      `{"subjective": string, "objective": string, "assessment": string, "plan": string}`,
      "Rules:",
      "- Preserve clinical facts verbatim. Do not invent findings, diagnoses, or measurements.",
      "- Use clinical shorthand where the dentist used it (e.g. #14 MOD, BOP, PPD).",
      "- If a section has no content in the transcript, return an empty string for it.",
      "- Keep each section under 500 characters.",
    ].join(" ");
    const user = data.context
      ? `Patient context: ${data.context}\n\nDictation:\n${data.transcript}`
      : `Dictation:\n${data.transcript}`;
    const raw = await callGateway(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { json: true },
    );
    const parsed = extractJson<Partial<SoapDraft>>(raw);
    return {
      subjective: String(parsed.subjective ?? ""),
      objective: String(parsed.objective ?? ""),
      assessment: String(parsed.assessment ?? ""),
      plan: String(parsed.plan ?? ""),
    };
  });

// ============= 2. Benefit breakdown from insurance text =============

export type BenefitBreakdown = {
  payer_name: string;
  plan_name: string;
  annual_maximum: number;
  deductible: number;
  preventive_pct: number;
  basic_pct: number;
  major_pct: number;
  ortho_pct: number;
  notes: string;
};

export const extractBenefits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) => {
    const text = String(input.text ?? "").trim();
    if (text.length < 20) throw new Error("Paste more coverage text (min 20 chars)");
    if (text.length > 20000) throw new Error("Text too long (20000 char max)");
    return { text };
  })
  .handler(async ({ data }): Promise<BenefitBreakdown> => {
    const system = [
      "You are an insurance benefits parser for a dental practice. Extract coverage",
      "details from the pasted breakdown of dental benefits. Output ONLY valid JSON:",
      `{"payer_name":string,"plan_name":string,"annual_maximum":number,"deductible":number,`,
      `"preventive_pct":number,"basic_pct":number,"major_pct":number,"ortho_pct":number,"notes":string}`,
      "Rules:",
      "- Percentages are 0-100 integers (use 0 when not covered).",
      "- Currency amounts are numbers (no $ or commas). Use 0 when unstated.",
      "- If ortho not covered, use 0 for ortho_pct.",
      "- notes: short summary of waiting periods, missing tooth clauses, frequency limits.",
    ].join(" ");
    const raw = await callGateway(
      [
        { role: "system", content: system },
        { role: "user", content: data.text },
      ],
      { json: true },
    );
    const p = extractJson<Partial<BenefitBreakdown>>(raw);
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const pct = (v: unknown) => Math.max(0, Math.min(100, Math.round(num(v))));
    return {
      payer_name: String(p.payer_name ?? "").slice(0, 120),
      plan_name: String(p.plan_name ?? "").slice(0, 120),
      annual_maximum: num(p.annual_maximum),
      deductible: num(p.deductible),
      preventive_pct: pct(p.preventive_pct),
      basic_pct: pct(p.basic_pct),
      major_pct: pct(p.major_pct),
      ortho_pct: pct(p.ortho_pct),
      notes: String(p.notes ?? "").slice(0, 600),
    };
  });

// ============= 3. Treatment plan explainer (patient-facing) =============

export type PlanExplainerItem = {
  procedure_code: string;
  description: string;
  fee: number;
  tooth_number?: number | null;
  surfaces?: string | null;
};

export const explainTreatmentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patient_name: string; items: PlanExplainerItem[] }) => {
    if (!Array.isArray(input.items) || input.items.length === 0) throw new Error("No procedures on this plan");
    if (input.items.length > 50) throw new Error("Too many procedures (50 max)");
    return {
      patient_name: String(input.patient_name ?? "").slice(0, 120),
      items: input.items.slice(0, 50),
    };
  })
  .handler(async ({ data }): Promise<string> => {
    const total = data.items.reduce((s, i) => s + Number(i.fee || 0), 0);
    const lines = data.items
      .map(
        (i) =>
          `- ${i.procedure_code} · ${i.description}` +
          (i.tooth_number ? ` · tooth #${i.tooth_number}` : "") +
          (i.surfaces ? ` (${i.surfaces})` : "") +
          ` · $${Number(i.fee).toFixed(0)}`,
      )
      .join("\n");
    const system = [
      "You are a friendly dental patient educator. Write a plain-language summary of",
      "the treatment plan for the patient (5th-8th grade reading level). Use short paragraphs.",
      "Sections: 1) What we're recommending and why (2-3 sentences). 2) Bullet list of each",
      "procedure with a one-sentence plain description of what it does. 3) What to expect at",
      "the visit(s). 4) Estimated total cost. Do NOT give medical advice or diagnose.",
      "Do NOT invent findings not in the list. Use warm, reassuring tone.",
      "Output plain text (no markdown headings, use ** for bold section titles).",
    ].join(" ");
    const user = `Patient: ${data.patient_name}\nTotal estimated cost: $${total.toFixed(0)}\n\nProcedures:\n${lines}`;
    return await callGateway([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
  });
