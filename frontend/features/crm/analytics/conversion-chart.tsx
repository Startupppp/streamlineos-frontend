"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE } from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";

interface ConversionChartProps {
  data: Array<{ name: string; value: number }>;
}

export function ConversionChart({ data }: ConversionChartProps) {
  return (
    <AnalyticsChartCard title="Won vs Lost" data={data} filename="won-vs-lost">
      {data.length === 0 ? (
        <ChartEmptyState message="No deals closed in this period" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value"
              label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""}: ${value ?? 0}`}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.name === "Won" ? "#10B981" : "#EF4444"} />
              ))}
            </Pie>
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </AnalyticsChartCard>
  );
}
