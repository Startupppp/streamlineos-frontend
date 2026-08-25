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
  if (score <= 2) return { label: "Low", className: "bg-muted text-foreground border-border", score };
  if (score <= 4) return { label: "Medium", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule", score };
  if (score === 6) return { label: "High", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule", score };
  return { label: "Critical", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule", score };
}
