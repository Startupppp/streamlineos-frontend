"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE,
  AXIS_TICK,
  CHART_COLORS,
} from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";
import { EmptyChart } from "./empty-chart";
import type { ScoreDistributionEntry } from "./use-analytics-data";

interface ScoreDistributionChartProps {
  data: ScoreDistributionEntry[];
}

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  const isEmpty = data.every((b) => b.count === 0);

  return (
    <AnalyticsChartCard
      title="Score Distribution"
      data={data}
      filename="score-distribution"
    >
      {isEmpty ? (
        <EmptyChart message="No scored leads yet" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="range" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </AnalyticsChartCard>
  );
}
