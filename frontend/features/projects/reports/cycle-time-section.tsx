"use client";

import { useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Timer } from "lucide-react";
import { useCycleTimeReport } from "@/hooks/api/projects/reports";
import { ChartCard, TOOLTIP_STYLE, AXIS_TICK } from "./chart-card";

export function CycleTimeSection({ projectId }: { projectId: number }) {
  const { data = [], isLoading, isError, refetch } =
    useCycleTimeReport(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  return (
    <ChartCard title="Cycle Time" icon={Timer}>
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : isError ? (
        <ErrorState
          compact
          onRetry={handleRetry}
          description="Could not load cycle time."
        />
      ) : data.length === 0 ? (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No data yet"
          description="Complete some tickets to see cycle time."
          compact
        />
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="week"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(w: string) => w.slice(5)}
              />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                unit=" d"
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [`${v ?? 0} days`, "Avg Cycle Time"]}
              />
              <Bar
                dataKey="avgDays"
                fill="#1d4ed8"
                radius={[4, 4, 0, 0]}
                name="Avg Days"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
