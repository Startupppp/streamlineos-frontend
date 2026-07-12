"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE,
  AXIS_TICK,
} from "@/features/crm/shared/constants";
import type { RevenueGoalEntry } from "./use-analytics-data";
import { AnalyticsChartCard } from "./analytics-chart-card";

type ChartValue = number | string | ReadonlyArray<number | string>;

function yAxisFormatter(v: number | string): string {
  return `₹${v}L`;
}

function tooltipFormatter(
  value: ChartValue | undefined,
  name: string | number | undefined,
): [string, string] {
  const display = Array.isArray(value) ? value[0] : value;
  return [`₹${display ?? 0}L`, name === "actual" ? "Actual" : "Target"];
}

function legendFormatter(value: string): string {
  return value === "actual" ? "Actual" : "Target";
}

interface RevenueVsGoalChartProps {
  data: RevenueGoalEntry[];
}

export function RevenueVsGoalChart({ data }: RevenueVsGoalChartProps) {
  return (
    <AnalyticsChartCard
      title="Revenue vs Goal (This Year)"
      data={data}
      filename="revenue-vs-goal"
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ ...AXIS_TICK, fontSize: 10 }} />
          <YAxis tick={AXIS_TICK} tickFormatter={yAxisFormatter} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={tooltipFormatter}
          />
          <Legend formatter={legendFormatter} />
          <Bar dataKey="actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="target" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
