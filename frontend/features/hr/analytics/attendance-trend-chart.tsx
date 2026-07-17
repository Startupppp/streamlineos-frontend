"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { CHART_SEMANTIC, chartAxisTick, chartGridProps, chartTooltipStyle } from "./shared";

interface AttendanceTrendChartProps {
  data: Array<{ date: string; count: number }>;
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid {...chartGridProps} />
        <XAxis
          dataKey="date"
          tick={chartAxisTick}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={chartAxisTick} allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Bar dataKey="count" fill={CHART_SEMANTIC.primary} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
