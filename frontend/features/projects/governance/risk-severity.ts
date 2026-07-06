import type { RiskProbability, RiskImpact } from "@/types/projects";

const PROB_IDX: Record<RiskProbability, number> = { low: 1, medium: 2, high: 3 };
const IMPACT_IDX: Record<RiskImpact, number> = { low: 1, medium: 2, high: 3 };

export interface RiskSeverityResult {
  label: "Low" | "Medium" | "High" | "Critical";
  className: string;
  score: number;
}

export function getRiskSeverity(
  probability: RiskProbability,
  impact: RiskImpact,
): RiskSeverityResult {
  const score = PROB_IDX[probability] * IMPACT_IDX[impact];
  if (score <= 2) return { label: "Low", className: "bg-slate-100 text-slate-700 border-slate-200", score };
  if (score <= 4) return { label: "Medium", className: "bg-amber-100 text-amber-700 border-amber-200", score };
  if (score === 6) return { label: "High", className: "bg-orange-100 text-orange-700 border-orange-200", score };
  return { label: "Critical", className: "bg-red-100 text-red-700 border-red-200", score };
}
