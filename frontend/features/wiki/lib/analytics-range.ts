export const ANALYTICS_RANGE_PRESETS = ["7d", "30d", "90d", "all"] as const;

export type AnalyticsRangePreset = (typeof ANALYTICS_RANGE_PRESETS)[number];

export const DEFAULT_ANALYTICS_RANGE_PRESET: AnalyticsRangePreset = "30d";

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

const PRESET_WINDOW_DAYS: Record<AnalyticsRangePreset, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

export function analyticsRangeFor(
  preset: AnalyticsRangePreset,
  now: Date,
): { from?: string } {
  const days = PRESET_WINDOW_DAYS[preset];
  if (days === null) return {};
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days),
  );
  return { from: start.toISOString() };
}

export function analyticsSpaceIdFrom(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}
