"use client";

import {
  BarChart,
  Bar,
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
import type { AssignmentDistribution } from "@/types/leads";
import { AnalyticsChartCard } from "./analytics-chart-card";

interface AssignmentDistributionChartProps {
  data: AssignmentDistribution[];
}

export function AssignmentDistributionChart({ data }: AssignmentDistributionChartProps) {
  return (
    <AnalyticsChartCard
      title="Lead Assignment Distribution"
      data={data}
      filename="assignment-distribution"
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={AXIS_TICK} />
          <YAxis dataKey="name" type="category" tick={AXIS_TICK} width={100} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
