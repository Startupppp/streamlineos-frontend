export function formatMinutes(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (value < 60) return `${Math.round(value)}m`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function formatPercent(value: number | null, decimals = 0): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatRatioPercent(value: number | null, decimals = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

const CATEGORICAL_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#0EA5E9",
  "#F97316",
  "#64748B",
] as const;

export function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return CATEGORICAL_COLORS[hash % CATEGORICAL_COLORS.length];
}
