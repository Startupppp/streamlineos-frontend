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
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { useVelocityReport, useBurnupReport } from "@/hooks/api/build/reports";
import { format } from "date-fns";
import { ChartCard } from "./chart-card";
import { getErrorMessage } from "@/lib/get-error-message";

const BurnupChart = dynamic(
  () => import("./burnup-chart").then((m) => ({ default: m.BurnupChart })),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

export function BurnupSection({ projectId }: { projectId: number }) {
  const velocity = useVelocityReport(projectId);
  const [cycleId, setCycleId] = useState<number | undefined>(undefined);

  const cycles = velocity.data ?? [];
  const activeCycleId =
    cycles.length > 0 ? cycles[cycles.length - 1].cycleId : undefined;
  const selectedCycleId = cycleId ?? activeCycleId;

  const { data, isLoading, isError, error, refetch } = useBurnupReport(
    projectId,
    selectedCycleId,
  );

  const handleRetry = useCallback(() => Promise.all([velocity.refetch(), refetch()]), [velocity.refetch, refetch]);

  const chartData = useMemo(
    () =>
      (data ?? []).map((p) => ({
        date: format(new Date(p.date), "MMM d"),
        Scope: p.scope,
        Completed: p.completed,
      })),
    [data],
  );

  function handleCycleChange(value: string) {
    setCycleId(Number(value));
  }

  const cycleSelect =
    cycles.length > 0 ? (
      <Select
        value={selectedCycleId ? String(selectedCycleId) : undefined}
        onValueChange={handleCycleChange}
      >
        <SelectTrigger className="w-44 text-sm bg-muted/40 border-border">
          <SelectValue placeholder="Recent cycles" />
        </SelectTrigger>
        <SelectContent>
          {cycles.map((s) => (
            <SelectItem key={s.cycleId} value={String(s.cycleId)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  return (
    <ChartCard title="Burnup · latest 100 cycles" icon={TrendingUp} actions={cycleSelect}>
      {velocity.isLoading || isLoading ? (
        <LoadingState variant="cards" rows={2} />
      ) : velocity.isError || isError ? (
        <ErrorState
          title="Could not load burnup"
          description={getErrorMessage(velocity.error ?? error)}
          onRetry={handleRetry}
          compact
        />
      ) : cycles.length === 0 || chartData.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration />}
          title="No cycle to chart"
          description="Burnup tracks completed work against scope across a cycle's date range."
          compact
        />
      ) : (
        <BurnupChart data={chartData} />
      )}
    </ChartCard>
  );
}
