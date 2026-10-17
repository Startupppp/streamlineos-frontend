"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { useProjectAnalytics } from "@/hooks/api/build/project-analytics";
import { parseEnum, useUrlFilters } from "@/lib/url-state/use-url-filters";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
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
import { PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";

interface ReportsOverviewTabProps {
  projectId: number;
}

const VOLUME_RANGES = ["12w", "90d", "30d", "7d"] as const;
type VolumeRange = (typeof VOLUME_RANGES)[number];
const DEFAULT_VOLUME_RANGE = "12w" satisfies VolumeRange;
const VOLUME_RANGE_OPTIONS = [
  { value: "12w", label: "Last 12 weeks" },
  { value: "90d", label: "Last 90 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
] as const satisfies readonly { value: VolumeRange; label: string }[];

export function ReportsOverviewTab({ projectId }: ReportsOverviewTabProps) {
  const searchParams = useSearchParams();
  const { update } = useUrlFilters();
  const volumeRange = parseEnum(searchParams.get("volumeRange"), VOLUME_RANGES, DEFAULT_VOLUME_RANGE);
  const analyticsParams = useMemo(
    () => (volumeRange === DEFAULT_VOLUME_RANGE ? undefined : { range: volumeRange }),
    [volumeRange],
  );
  const { data: analytics, isLoading, isError, error, refetch } =
    useProjectAnalytics(projectId, analyticsParams, { placeholderData: keepPreviousData });

  const handleVolumeRangeChange = useCallback(
    (next: string) => {
      update({ volumeRange: next === DEFAULT_VOLUME_RANGE ? null : next });
    },
    [update],
  );

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
        className={CONTENT_FILL_PANEL}
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
            className={CONTENT_FILL_PANEL}
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
            <ChartShell
              title="Volume Over Time"
              actions={
                <BuildFilterSelect
                  label="Volume range"
                  value={volumeRange}
                  onValueChange={handleVolumeRangeChange}
                  options={VOLUME_RANGE_OPTIONS}
                  className="h-8 md:min-w-36"
                />
              }
            >
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
