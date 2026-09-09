"use client";

import { useMemo, useCallback } from "react";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge } from "lucide-react";
import { useVelocityReport } from "@/hooks/api/build/reports";
import { ChartCard } from "./chart-card";

const VelocityChart = dynamic(
  () => import("./velocity-chart").then((m) => ({ default: m.VelocityChart })),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

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
    <ChartCard title="Velocity · latest 100 sprints" icon={Gauge}>
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
        <VelocityChart data={chartData} />
      )}
    </ChartCard>
  );
}
