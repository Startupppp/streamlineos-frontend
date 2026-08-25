"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE, AXIS_TICK } from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";
import { EmptyChart } from "./empty-chart";

interface DealValueChartProps {
  data: Array<{ stage: string; value: number }>;
}

export function DealValueChart({ data }: DealValueChartProps) {
  return (
    <AnalyticsChartCard title="Deal Value by Stage" data={data} filename="deal-value-by-stage">
      {data.length === 0 ? (
        <EmptyChart message="No open deals to value in this period" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="stage" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`₹${value}L`, "Value"]} />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </AnalyticsChartCard>
  );
}
