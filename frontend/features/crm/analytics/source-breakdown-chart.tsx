"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE } from "@/features/crm/shared/constants";

const SOURCE_COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#2563eb", "#f59e0b", "#10b981"];
import { AnalyticsChartCard } from "./analytics-chart-card";
import { EmptyChart } from "./empty-chart";

interface SourceBreakdownChartProps {
  data: Array<{ name: string; value: number }>;
}

export function SourceBreakdownChart({ data }: SourceBreakdownChartProps) {
  return (
    <AnalyticsChartCard title="Lead Source Breakdown" data={data} filename="lead-sources">
      {data.length === 0 ? (
        <EmptyChart message="No leads with a recorded source in this period" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value"
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {data.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </AnalyticsChartCard>
  );
}
