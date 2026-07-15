"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useVelocityReport, useBurnupReport } from "@/hooks/api/projects/reports";
import { format } from "date-fns";
import { ChartCard, TOOLTIP_STYLE, AXIS_TICK, numberFormatter } from "./chart-card";

export function BurnupSection({ projectId }: { projectId: number }) {
  const velocity = useVelocityReport(projectId);
  const [sprintId, setSprintId] = useState<number | undefined>(undefined);

  const sprints = velocity.data ?? [];
  const activeSprintId =
    sprints.length > 0 ? sprints[sprints.length - 1].sprintId : undefined;
  const selectedSprintId = sprintId ?? activeSprintId;

  const { data, isLoading, isError, refetch } = useBurnupReport(
    projectId,
    selectedSprintId,
  );

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const chartData = useMemo(
    () =>
      (data ?? []).map((p) => ({
        date: format(new Date(p.date), "MMM d"),
        Scope: p.scope,
        Completed: p.completed,
      })),
    [data],
  );

  function handleSprintChange(value: string) {
    setSprintId(Number(value));
  }

  const sprintSelect =
    sprints.length > 0 ? (
      <Select
        value={selectedSprintId ? String(selectedSprintId) : undefined}
        onValueChange={handleSprintChange}
      >
        <SelectTrigger className="w-44 text-sm bg-muted/40 border-border">
          <SelectValue placeholder="Select sprint" />
        </SelectTrigger>
        <SelectContent>
          {sprints.map((s) => (
            <SelectItem key={s.sprintId} value={String(s.sprintId)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  return (
    <ChartCard title="Burnup" icon={TrendingUp} actions={sprintSelect}>
      {velocity.isLoading || isLoading ? (
        <LoadingState variant="cards" rows={2} />
      ) : velocity.isError || isError ? (
        <ErrorState
          title="Could not load burnup"
          description="Something went wrong while computing the burnup chart."
          onRetry={handleRetry}
          compact
        />
      ) : sprints.length === 0 || chartData.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration />}
          title="No sprint to chart"
          description="Burnup tracks completed work against scope across a sprint's date range."
          compact
        />
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="burnupCompleted"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
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
              <Area
                type="monotone"
                dataKey="Scope"
                stroke="#94A3B8"
                strokeDasharray="4 4"
                fill="transparent"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Completed"
                stroke="#10B981"
                fill="url(#burnupCompleted)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
