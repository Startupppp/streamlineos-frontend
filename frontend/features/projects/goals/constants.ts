import type {@/hooks/api/goals
  GoalLevel,
  GoalStatus,
  KeyResultMetric,
} from "@/hooks/api/goals";

interface StatusConfig {
  value: GoalStatus;
  label: string;
  variant: "secondary" | "default" | "destructive" | "outline";
  dot: string;
}

export const STATUS_CONFIG: Record<GoalStatus, StatusConfig> = {
  not_started: {
    value: "not_started",
    label: "Not Started",
    variant: "secondary",
    dot: "bg-muted-foreground",
  },
  on_track: {
    value: "on_track",
    label: "On Track",
    variant: "default",
    dot: "bg-emerald-500",
  },
  at_risk: {
    value: "at_risk",
    label: "At Risk",
    variant: "outline",
    dot: "bg-amber-500",
  },
  off_track: {
    value: "off_track",
    label: "Off Track",
    variant: "destructive",
    dot: "bg-red-500",
  },
  completed: {
    value: "completed",
    label: "Completed",
    variant: "default",
    dot: "bg-blue-500",
  },
};

export const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "on_track", label: "On Track" },
  { value: "at_risk", label: "At Risk" },
  { value: "off_track", label: "Off Track" },
  { value: "completed", label: "Completed" },
];

export const LEVEL_OPTIONS: { value: GoalLevel; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "team", label: "Team" },
  { value: "individual", label: "Individual" },
];

export const LEVEL_LABEL: Record<GoalLevel, string> = {
  company: "Company",
  team: "Team",
  individual: "Individual",
};

export const METRIC_OPTIONS: { value: KeyResultMetric; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "percentage", label: "Percentage" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Done / Not Done" },
];

export function keyResultPercent(kr: {
  metricType: KeyResultMetric;
  startValue: string;
  targetValue: string;
  currentValue: string;
}): number {
  if (kr.metricType === "boolean") {
    return parseFloat(kr.currentValue) >= 1 ? 100 : 0;
  }
  const start = parseFloat(kr.startValue);
  const target = parseFloat(kr.targetValue);
  const current = parseFloat(kr.currentValue);
  const denominator = target - start;
  if (denominator === 0) {
    return current >= target ? 100 : 0;
  }
  const pct = ((current - start) / denominator) * 100;
  if (Number.isNaN(pct)) return 0;
  return Math.min(Math.max(Math.round(pct), 0), 100);
}

export function formatMetricValue(
  value: string,
  metricType: KeyResultMetric,
  unit: string | null,
): string {
  const num = parseFloat(value);
  if (metricType === "boolean") {
    return num >= 1 ? "Done" : "Not done";
  }
  const formatted = Number.isInteger(num)
    ? num.toLocaleString()
    : num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (metricType === "percentage") return `${formatted}%`;
  if (metricType === "currency") return `${unit ?? "₹"}${formatted}`;
  return unit ? `${formatted} ${unit}` : formatted;
}
