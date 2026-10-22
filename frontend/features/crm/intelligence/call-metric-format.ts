
export const METRIC_UNKNOWN = "—";

export function formatBpsPercent(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return METRIC_UNKNOWN;
  return `${Math.round(bps / 100)}%`;
}

export function formatQuestionsPerTenTurns(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return METRIC_UNKNOWN;
  return (bps / 1000).toFixed(1);
}
