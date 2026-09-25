

const PROB_IDX: Record<string, number> = { low: 1, medium: 2, high: 3 };
const IMPACT_IDX: Record<string, number> = { low: 1, medium: 2, high: 3 };

export interface RiskSeverityResult {
  label: "Low" | "Medium" | "High" | "Critical";
  className: string;
  score: number;
}

export function getRiskSeverity(
  probability: string,
  impact: string,
): RiskSeverityResult {
  const score = PROB_IDX[probability] * IMPACT_IDX[impact];
  if (score <= 2) return { label: "Low", className: "bg-muted text-foreground border-border", score };
  if (score <= 4) return { label: "Medium", className: "bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule", score };
  if (score === 6) return { label: "High", className: "bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule", score };
  return { label: "Critical", className: "bg-status-danger-surface text-status-danger-ink-strong border-status-danger-rule", score };
}
