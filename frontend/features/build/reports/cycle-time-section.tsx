"use client";

import { useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import dynamic from "next/dynamic";
import { Timer } from "lucide-react";
import { useCycleTimeReport } from "@/hooks/api/build/reports";
import { ChartCard } from "./chart-card";
import { useCanState } from "@/hooks/api/access";

const CycleTimeChart = dynamic(
  () => import("./cycle-time-chart").then((m) => ({ default: m.CycleTimeChart })),
  { ssr: false, loading: () => <Skeleton className="h-52 w-full rounded-lg" /> },
);

export function CycleTimeSection({ projectId }: { projectId: number }) {
  const accessState = useCanState("build:view");
  const { data = [], isLoading, isError, refetch } =
    useCycleTimeReport(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  if (accessState === "denied" || accessState === "loading") return null;

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
        <CycleTimeChart data={data} />
      )}
    </ChartCard>
  );
}
