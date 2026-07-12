"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE,
  AXIS_TICK,
} from "@/features/crm/shared/constants";
import type { MonthlyRevenue } from "@/types/leads";
import { AnalyticsChartCard } from "./analytics-chart-card";

type ChartValue = number | string | ReadonlyArray<number | string>;

function revenueFormatter(value: ChartValue | undefined): [string, string] {
  return [`₹${(Number(Array.isArray(value) ? value[0] : (value ?? 0)) / 100000).toFixed(1)}L`, "Revenue"];
}

interface MonthlyRevenueChartProps {
  data: MonthlyRevenue[];
}

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  return (
    <AnalyticsChartCard
      title="Monthly Revenue Trend"
      data={data}
      filename="monthly-revenue"
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={revenueFormatter}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#revenueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
