import type { AppointmentWithPatient } from "@/lib/appointments-api";

export type RiskLevel = "low" | "medium" | "high";
export type RiskScore = {
  score: number; // 0-100
  level: RiskLevel;
  reasons: string[];
};

/**
 * Predictive no-show risk. Deterministic heuristic scoring (no ML server call needed).
 * Factors:
 *  - Unconfirmed status → +30
 *  - Long lead time (>21 days) → +15
 *  - Very short lead time (<1 day) → +5
 *  - Late-in-day slot (>= 16:00) → +10
 *  - Monday or Friday → +5
 *  - First-time patient (no history) → +10
 *  - Historical no-show rate: past no-shows / past total (>= 1 visit)
 *      * >= 40% → +40, >= 20% → +25, >= 10% → +15
 *  - Recent no-show in last 90 days → +15
 */
export function scoreNoShow(
  appt: AppointmentWithPatient,
  history: { start_at: string; status: string; patient_id: string }[],
): RiskScore {
  const reasons: string[] = [];
  let score = 0;

  const start = new Date(appt.start_at);
  const now = new Date();
  const leadDays = (start.getTime() - now.getTime()) / 86_400_000;

  if (appt.status === "unconfirmed") {
    score += 30;
    reasons.push("Unconfirmed");
  }
  if (leadDays > 21) {
    score += 15;
    reasons.push("Booked >3 weeks out");
  } else if (leadDays > 0 && leadDays < 1) {
    score += 5;
    reasons.push("Same-day booking");
  }

  const hour = start.getHours();
  if (hour >= 16) {
    score += 10;
    reasons.push("Late-afternoon slot");
  }
  const dow = start.getDay();
  if (dow === 1 || dow === 5) {
    score += 5;
    reasons.push(dow === 1 ? "Monday" : "Friday");
  }

  const past = history.filter(
    (h) => h.patient_id === appt.patient_id && new Date(h.start_at).getTime() < now.getTime(),
  );
  if (past.length === 0) {
    score += 10;
    reasons.push("First-time patient");
  } else {
    const noShows = past.filter((h) => h.status === "no-show").length;
    const rate = noShows / past.length;
    if (rate >= 0.4) {
      score += 40;
      reasons.push(`${Math.round(rate * 100)}% no-show history`);
    } else if (rate >= 0.2) {
      score += 25;
      reasons.push(`${Math.round(rate * 100)}% no-show history`);
    } else if (rate >= 0.1) {
      score += 15;
      reasons.push(`${Math.round(rate * 100)}% no-show history`);
    }
    const recent = past.some(
      (h) =>
        h.status === "no-show" &&
        now.getTime() - new Date(h.start_at).getTime() < 90 * 86_400_000,
    );
    if (recent) {
      score += 15;
      reasons.push("No-show in last 90 days");
    }
  }

  score = Math.max(0, Math.min(100, score));
  const level: RiskLevel = score >= 55 ? "high" : score >= 30 ? "medium" : "low";
  return { score, level, reasons };
}

export const RISK_TONE: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  medium: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  high: "bg-red-100 text-red-700 ring-1 ring-red-200",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High no-show risk",
};
