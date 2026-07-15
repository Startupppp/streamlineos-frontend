"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { Layers, Camera } from "lucide-react";
import { useCfdReport, useCaptureSnapshot } from "@/hooks/api/projects/reports";
import { format } from "date-fns";
import { toast } from "sonner";
import { ChartCard, TOOLTIP_STYLE, AXIS_TICK, numberFormatter } from "./chart-card";

const CFD_GROUPS = [
  { key: "backlog", label: "Backlog", color: "#94A3B8" },
  { key: "unstarted", label: "Unstarted", color: "#3B82F6" },
  { key: "started", label: "Started", color: "#F59E0B" },
  { key: "completed", label: "Completed", color: "#10B981" },
  { key: "cancelled", label: "Cancelled", color: "#EF4444" },
] as const;

export function CfdSection({ projectId }: { projectId: number }) {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, refetch } = useCfdReport(projectId, days);
  const capture = useCaptureSnapshot(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  function handleDaysChange(value: string) {
    setDays(Number(value));
  }

  function handleCapture() {
    capture.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(`Snapshot captured (${result.captured} states)`),
      onError: () => toast.error("Failed to capture snapshot"),
    });
  }

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        date: format(new Date(p.date), "MMM d"),
        backlog: p.backlog,
        unstarted: p.unstarted,
        started: p.started,
        completed: p.completed,
        cancelled: p.cancelled,
      })),
    [data],
  );

  const actions = (
    <div className="flex items-center gap-2">
      <Select value={String(days)} onValueChange={handleDaysChange}>
        <SelectTrigger className="w-28 text-sm bg-muted/40 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="14">14 days</SelectItem>
          <SelectItem value="30">30 days</SelectItem>
          <SelectItem value="60">60 days</SelectItem>
          <SelectItem value="90">90 days</SelectItem>
        </SelectContent>
      </Select>
      <LoadingButton
        size="sm"
        variant="outline"
        className=""
        onClick={handleCapture}
        isPending={capture.isPending}
        loadingText="Capturing…"
      >
        <Camera className="h-3.5 w-3.5 mr-1.5" />
        Capture today
      </LoadingButton>
    </div>
  );

  return (
    <ChartCard title="Cumulative Flow" icon={Layers} actions={actions}>
      {isLoading ? (
        <LoadingState variant="cards" rows={2} />
      ) : isError ? (
        <ErrorState
          title="Could not load cumulative flow"
          description="Something went wrong while loading flow history."
          onRetry={handleRetry}
          compact
        />
      ) : chartData.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration />}
          title="No flow history yet"
          description="The cumulative flow diagram accrues one data point per day. Capture today's snapshot to start building history."
          action={{
            label: capture.isPending ? "Capturing…" : "Capture today's snapshot",
            onClick: handleCapture,
          }}
          compact
        />
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
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
              {CFD_GROUPS.map((g) => (
                <Area
                  key={g.key}
                  type="monotone"
                  dataKey={g.key}
                  name={g.label}
                  stackId="cfd"
                  stroke={g.color}
                  fill={g.color}
                  fillOpacity={0.65}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
