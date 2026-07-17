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

interface AttritionTrendChartProps {
  data: Array<{ month: string; resignations: number }>;
}

export function AttritionTrendChart({ data }: AttritionTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        barCategoryGap="32%"
      >
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
        <YAxis tick={chartAxisTick} allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Bar
          dataKey="resignations"
          fill={CHART_SEMANTIC.danger}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
