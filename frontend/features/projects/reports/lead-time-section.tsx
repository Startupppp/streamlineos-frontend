"use client";

import { useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useLeadTimeReport } from "@/hooks/api/projects/reports";
import { ChartCard, TOOLTIP_STYLE, AXIS_TICK } from "./chart-card";

export function LeadTimeSection({ projectId }: { projectId: number }) {
  const { data = [], isLoading, isError, refetch } =
    useLeadTimeReport(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  return (
    <ChartCard title="Lead Time" icon={TrendingUp}>
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : isError ? (
        <ErrorState
          compact
          onRetry={handleRetry}
          description="Could not load lead time."
        />
      ) : data.length === 0 ? (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No data yet"
          description="Complete some tickets to see lead time."
          compact
        />
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
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
                formatter={(v) => [`${v ?? 0} days`]}
              />
              <Area
                dataKey="p90Days"
                fill="#93c5fd"
                stroke="#60a5fa"
                strokeWidth={1.5}
                name="P90"
              />
              <Area
                dataKey="p50Days"
                fill="#60a5fa"
                stroke="#1d4ed8"
                strokeWidth={2}
                name="P50 (Median)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
