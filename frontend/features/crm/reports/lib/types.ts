export type Period = "week" | "month" | "quarter" | "year";

export interface PeriodOption {
  label: string;
  value: Period;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 3 Months", value: "quarter" },
  { label: "This Year", value: "year" },
];

export const PIPELINE_COLORS: Record<string, { color: string }> = {
  NEW: { color: "#3B82F6" },
  CONTACTED: { color: "#0EA5E9" },
  INTERESTED: { color: "#F59E0B" },
  QUALIFIED: { color: "#8B5CF6" },
  CONVERTED: { color: "#10B981" },
  LOST: { color: "#EF4444" },
};

export const FUNNEL_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
] as const;

export interface LeadSourceStat {
  source: string;
  count: number;
  converted: number;
  conversionRate: number;
  totalValue: number;
}

export interface LeadSourceReport {
  sources: LeadSourceStat[];
  total: number;
}

export function formatCurrency(value: number): string {
  if (value >= 10_00_000) return `₹${(value / 10_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function periodToDateRange(
  period: Period,
): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];

  if (period === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
  }
  if (period === "quarter") {
    const from = new Date(now);
    from.setMonth(now.getMonth() - 3);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
  }
  const from = new Date(now.getFullYear(), 0, 1);
  return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
}
