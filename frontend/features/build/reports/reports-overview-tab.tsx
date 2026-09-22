"use client";

import { useCallback, useMemo } from "react";
import { useProjectAnalytics } from "@/hooks/api/build";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AnalyticsKpiStrip,
  AnalyticsKpiStripSkeleton,
} from "@/features/build/analytics/analytics-kpi-strip";
import {
  StateDistributionChart,
  PriorityBreakdownChart,
  VolumeOverTimeChart,
  AssigneeCompletionChart,
  CycleVelocityChart,
  EstimateVsActualChart,
} from "@/features/build/analytics/project-charts";
import { ChartShell } from "@/features/build/analytics/chart-shell";
import {
  buildStateData,
  buildPriorityData,
  buildVolumeData,
  buildAssigneeData,
  buildVelocityData,
  buildEstimateData,
} from "@/features/build/analytics/analytics-chart-data";
import { PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";

interface ReportsOverviewTabProps {
  projectId: number;
}

export function ReportsOverviewTab({ projectId }: ReportsOverviewTabProps) {
  const { data: analytics, isLoading, isError, error, refetch } =
    useProjectAnalytics(projectId);

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: !analytics,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const stateData = useMemo(() => buildStateData(analytics), [analytics]);
  const priorityData = useMemo(() => buildPriorityData(analytics), [analytics]);
  const volumeData = useMemo(() => buildVolumeData(analytics), [analytics]);
  const assigneeData = useMemo(() => buildAssigneeData(analytics), [analytics]);
  const velocityData = useMemo(() => buildVelocityData(analytics), [analytics]);
  const estimateData = useMemo(() => buildEstimateData(analytics), [analytics]);

  return (
    <>
      <PageState
        resolution={pageState}
        className={PM_FILL_PANEL}
        onRetry={handleRetry}
        loading={
          <>
            <AnalyticsKpiStripSkeleton />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-xl" />
              ))}
            </div>
          </>
        }
        empty={
          <EmptyState
            className={PM_FILL_PANEL}
            illustrationPreset="chart"
            title="No analytics yet"
            description="Analytics will appear once your project has tickets."
          />
        }
      >
        <PmSection index={0}>
          {analytics ? <AnalyticsKpiStrip analytics={analytics} /> : null}
        </PmSection>
        <PmSection index={1}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ChartShell title="State Distribution">
              <StateDistributionChart data={stateData} />
            </ChartShell>
            <ChartShell title="Priority Breakdown">
              <PriorityBreakdownChart data={priorityData} />
            </ChartShell>
            <ChartShell title="Volume Over Time">
              <VolumeOverTimeChart data={volumeData} />
            </ChartShell>
            <ChartShell title="Completion by Assignee">
              <AssigneeCompletionChart data={assigneeData} />
            </ChartShell>
            <ChartShell title="Cycle Velocity">
              <CycleVelocityChart data={velocityData} />
            </ChartShell>
            <ChartShell title="Estimate vs Actual">
              <EstimateVsActualChart data={estimateData} />
            </ChartShell>
          </div>
        </PmSection>
      </PageState>
    </>
  );
}
