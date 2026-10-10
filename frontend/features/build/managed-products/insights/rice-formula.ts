export interface RiceInputs {
  reach: string;
  reachPeriod: "month" | "quarter" | "year";
  impact: number;
  confidence: number;
  effort: number;
  effortUnit: "person_days" | "person_weeks" | "person_months";
}

const PERIOD_MONTHS: Record<RiceInputs["reachPeriod"], number> = {
  month: 1,
  quarter: 3,
  year: 12,
};

const EFFORT_TO_DAYS: Record<RiceInputs["effortUnit"], number> = {
  person_days: 1,
  person_weeks: 5,
  person_months: 20,
};

export function computeRiceScore(inputs: RiceInputs): number | null {
  const reachNum = Number(inputs.reach);
  if (!Number.isFinite(reachNum) || reachNum <= 0) return null;
  if (!Number.isFinite(inputs.impact) || inputs.impact <= 0) return null;
  if (!Number.isFinite(inputs.confidence) || inputs.confidence < 0 || inputs.confidence > 1) return null;
  if (!Number.isFinite(inputs.effort) || inputs.effort <= 0) return null;

  const months = PERIOD_MONTHS[inputs.reachPeriod] ?? 1;
  const effortDays = inputs.effort * EFFORT_TO_DAYS[inputs.effortUnit];
  const reachPerMonth = reachNum / months;

  return (reachPerMonth * inputs.impact * inputs.confidence) / effortDays;
}

export function formatRiceScore(score: number | null): string {
  if (score === null) return "Unscored";
  return score.toFixed(2);
}

export function isRiceComplete(
  reach: string,
  impact: number | null,
  confidence: number | null,
  effort: string,
): boolean {
  if (!reach || !reach.trim()) return false;
  if (impact === null || !Number.isFinite(impact)) return false;
  if (confidence === null || !Number.isFinite(confidence)) return false;
  if (!effort || !effort.trim() || Number(effort) <= 0) return false;
  return true;
}
