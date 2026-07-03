"use client";

import { useMemo, useCallback } from "react";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
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
import { Gauge } from "lucide-react";
import { useVelocityReport } from "@/hooks/api/projects/reports";
import { ChartCard, TOOLTIP_STYLE, AXIS_TICK, numberFormatter } from "./chart-card";

export function VelocitySection({ projectId }: { projectId: number }) {
  const { data, isLoading, isError, refetch } = useVelocityReport(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const chartData = useMemo(
    () =>
      (data ?? []).map((s) => ({
        name: s.name,
        Committed: s.committedPoints,
        Completed: s.completedPoints,
      })),
    [data],
  );

  return (
    <ChartCard title="Velocity" icon={Gauge}>
      {isLoading ? (
        <LoadingState variant="cards" rows={2} />
      ) : isError ? (
        <ErrorState
          title="Could not load velocity"
          description="Something went wrong while computing sprint velocity."
          onRetry={handleRetry}
          compact
        />
      ) : chartData.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration />}
          title="No sprint data yet"
          description="Velocity appears once you have active or completed sprints with estimated work."
          compact
        />
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => numberFormatter.format(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Committed" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
