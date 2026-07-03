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

export const PIPELINE_COLORS: Record<string, { bgLight: string; borderLeft: string; text: string; dot: string }> = {
  NEW:        { bgLight: "bg-blue-500/10",    borderLeft: "border-l-blue-500",   text: "text-blue-600",   dot: "bg-blue-500" },
  CONTACTED:  { bgLight: "bg-sky-500/10",     borderLeft: "border-l-sky-500",    text: "text-sky-600",    dot: "bg-sky-500" },
  INTERESTED: { bgLight: "bg-amber-500/10",   borderLeft: "border-l-amber-500",  text: "text-amber-600",  dot: "bg-amber-500" },
  QUALIFIED:  { bgLight: "bg-violet-500/10",  borderLeft: "border-l-violet-500", text: "text-violet-600", dot: "bg-violet-500" },
  CONVERTED:  { bgLight: "bg-emerald-500/10", borderLeft: "border-l-emerald-500",text: "text-emerald-600",dot: "bg-emerald-500" },
  LOST:       { bgLight: "bg-red-500/10",     borderLeft: "border-l-red-500",    text: "text-red-600",    dot: "bg-red-500" },
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
