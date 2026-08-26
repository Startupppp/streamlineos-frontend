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
} from "@/features/crm/shared/constants";

const SCORE_COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];
import { AnalyticsChartCard } from "./analytics-chart-card";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
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
        <ChartEmptyState message="No scored leads yet" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="range" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </AnalyticsChartCard>
  );
}
