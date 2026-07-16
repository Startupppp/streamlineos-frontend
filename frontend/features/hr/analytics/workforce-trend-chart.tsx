"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_SEMANTIC, chartAxisTick, chartGridProps, chartTooltipStyle } from "./shared";

interface WorkforceTrendChartProps {
  data: Array<{ month: string; joins: number; exits: number }>;
}

export function WorkforceTrendChart({ data }: WorkforceTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
        <YAxis tick={chartAxisTick} allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Line
          type="monotone"
          dataKey="joins"
          name="New Joins"
          stroke={CHART_SEMANTIC.success}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART_SEMANTIC.success }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="exits"
          name="Exits"
          stroke={CHART_SEMANTIC.danger}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART_SEMANTIC.danger }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
