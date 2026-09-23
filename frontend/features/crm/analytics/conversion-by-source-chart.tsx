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
import type { ConversionBySource } from "@/types/leads";
import { AnalyticsChartCard } from "./analytics-chart-card";

interface ConversionBySourceChartProps {
  data: ConversionBySource[];
}

export function ConversionBySourceChart({ data }: ConversionBySourceChartProps) {
  return (
    <AnalyticsChartCard
      title="Conversion Rate by Source"
      data={data}
      filename="conversion-by-source"
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="source" tick={{ ...AXIS_TICK, fontSize: 10 }} />
          <YAxis tick={AXIS_TICK} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="total" name="Total" fill="#94A3B8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="converted" name="Converted" fill="#10B981" radius={[4, 4, 0, 0]} />
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
