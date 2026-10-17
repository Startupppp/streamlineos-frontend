"use client";

import { useMemo, useCallback } from "react";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge } from "lucide-react";
import { useVelocityReport } from "@/hooks/api/build/reports";
import type { FilterEnvelopeV1 } from "@/lib/filter-envelope/filter-envelope-v1";
import { ChartCard } from "./chart-card";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

const VelocityChart = dynamic(
  () => import("./velocity-chart").then((m) => ({ default: m.VelocityChart })),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

export function VelocitySection({ projectId, filterEnvelope }: { projectId: number; filterEnvelope?: FilterEnvelopeV1 }) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVelocityReport(projectId, filterEnvelope);

  const handleRetry = useCallback(() => refetch(), [refetch]);
  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const sprints = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const chartData = useMemo(
    () =>
      sprints.map((s) => ({
        name: s.name,
        Committed: s.committedPoints,
        Completed: s.completedPoints,
      })),
    [sprints],
  );

  const resolution = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: chartData.length === 0,
  });

  return (
    <ChartCard title="Velocity" icon={Gauge}>
      <PageState
        resolution={resolution}
        loading={<LoadingState variant="cards" rows={2} />}
        empty={
          <EmptyState
            illustration={<EmptyLeaderboardIllustration />}
            title="No cycle data yet"
            description="Velocity appears once you have active or completed cycles with estimated work."
            compact
          />
        }
        onRetry={handleRetry}
        compact
      >
        <VelocityChart data={chartData} />
        <InfiniteScrollSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={handleLoadMore}
          label="Load more velocity cycles"
          exhausted="All cycles loaded"
        />
      </PageState>
    </ChartCard>
  );
}
