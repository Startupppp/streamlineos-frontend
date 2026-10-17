"use client";

import { useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import dynamic from "next/dynamic";
import { TrendingUp } from "lucide-react";
import { useLeadTimeReport } from "@/hooks/api/build/reports";
import { ChartCard } from "./chart-card";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

const LeadTimeChart = dynamic(
  () => import("./lead-time-chart").then((m) => ({ default: m.LeadTimeChart })),
  { ssr: false, loading: () => <Skeleton className="h-52 w-full rounded-lg" /> },
);

export function LeadTimeSection({ projectId }: { projectId: number }) {
  const { data = [], isLoading, isError, error, refetch } =
    useLeadTimeReport(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const resolution = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: data.length === 0,
  });

  return (
    <ChartCard title="Lead Time" icon={TrendingUp}>
      <PageState
        resolution={resolution}
        loading={<Skeleton className="h-48 w-full rounded-lg" />}
        empty={
          <EmptyState
            illustration={<EmptySearchIllustration />}
            title="No data yet"
            description="Complete some tickets to see lead time."
            compact
          />
        }
        onRetry={handleRetry}
        compact
      >
        <LeadTimeChart data={data} />
      </PageState>
    </ChartCard>
  );
}
