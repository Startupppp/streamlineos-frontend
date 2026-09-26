"use client";

import { useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import dynamic from "next/dynamic";
import { Timer } from "lucide-react";
import { useCycleTimeReport } from "@/hooks/api/build/reports";
import { ChartCard } from "./chart-card";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

const CycleTimeChart = dynamic(
  () => import("./cycle-time-chart").then((m) => ({ default: m.CycleTimeChart })),
  { ssr: false, loading: () => <Skeleton className="h-52 w-full rounded-lg" /> },
);

export function CycleTimeSection({ projectId }: { projectId: number }) {
  const { data = [], isLoading, isError, error, refetch } =
    useCycleTimeReport(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const resolution = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: data.length === 0,
  });

  return (
    <ChartCard title="Cycle Time" icon={Timer}>
      <PageState
        resolution={resolution}
        loading={<Skeleton className="h-48 w-full rounded-lg" />}
        empty={
          <EmptyState
            illustration={<EmptySearchIllustration />}
            title="No data yet"
            description="Complete some tickets to see cycle time."
            compact
          />
        }
        onRetry={handleRetry}
        compact
      >
        <CycleTimeChart data={data} />
      </PageState>
    </ChartCard>
  );
}
