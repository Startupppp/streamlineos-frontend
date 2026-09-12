export const COSTING_METHOD_BADGE_CLASS: Record<string, string | undefined> = {
  FIFO: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  WEIGHTED_AVERAGE: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  STANDARD: "bg-status-success-surface text-status-success-ink border-status-success-rule",
};

const COSTING_METHOD_LABEL: Record<string, string | undefined> = {
  FIFO: "FIFO",
  WEIGHTED_AVERAGE: "Weighted Avg",
  STANDARD: "Standard",
};

export function costingMethodLabel(method: string): string {
  return COSTING_METHOD_LABEL[method] ?? method;
}
