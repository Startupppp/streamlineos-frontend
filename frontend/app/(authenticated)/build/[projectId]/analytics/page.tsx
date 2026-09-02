"use client";

import { use, useCallback, useMemo } from "react";
import { useProjectAnalytics } from "@/hooks/api/build";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
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
  STATE_COLORS,
  PRIORITY_COLORS,
} from "@/features/build/analytics/project-charts";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/build/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr, 10);

  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useProjectAnalytics(projectId);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const stateData = useMemo(() => {
    if (!analytics?.stateDistribution) return [];
    return analytics.stateDistribution.map((row) => {
      const state = row.status ?? "unknown";
      return {
        state: state
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase()),
        count: row.count,
        fill: STATE_COLORS[state.toLowerCase()] ?? "#94a3b8",
      };
    });
  }, [analytics?.stateDistribution]);

  const priorityData = useMemo(() => {
    if (!analytics?.priorityBreakdown) return [];
    return analytics.priorityBreakdown.map((row) => {
      const priority = row.priority ?? "none";
      return {
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        value: row.count,
        fill: PRIORITY_COLORS[priority.toLowerCase()] ?? "#94a3b8",
      };
    });
  }, [analytics?.priorityBreakdown]);

  const volumeData = useMemo(() => {
    if (!analytics?.volumeOverTime) return [];
    return analytics.volumeOverTime.map((entry) => ({
      date: entry.week ?? "",
      created: entry.count,
    }));
  }, [analytics?.volumeOverTime]);

  const assigneeData = useMemo(() => {
    if (!analytics?.assigneeCompletion) return [];
    return analytics.assigneeCompletion.map((entry) => ({
      name: entry.assigneeName ?? "Unassigned",
      completed: entry.completed,
      total: entry.total,
      rate:
        entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
    }));
  }, [analytics?.assigneeCompletion]);

  const velocityData = useMemo(() => {
    if (!analytics?.cycleVelocity) return [];
    return analytics.cycleVelocity.map((entry) => ({
      cycle: entry.cycleName ?? "Deleted cycle",
      points: entry.completedPoints,
    }));
  }, [analytics?.cycleVelocity]);

  const estimateData = useMemo(() => {
    if (!analytics?.estimateVsActual) return [];
    return analytics.estimateVsActual.map((entry) => ({
      label: entry.title || `#${entry.ticketId}`,
      estimate: entry.estimated ? parseFloat(entry.estimated) : 0,
      actual: entry.actual,
    }));
  }, [analytics?.estimateVsActual]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Analytics"
        subtitle="Velocity, health, and ticket insights"
      >
        <PmPageShell>
          <AnalyticsKpiStripSkeleton />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[296px] w-full rounded-xl" />
            ))}
          </div>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Analytics"
        subtitle="Velocity, health, and ticket insights"
      >
        <PmPageShell>
          <ErrorState
            className={PM_FILL_PANEL}
            title="Couldn't load analytics"
            description="The analytics for this project could not be read. Please try again."
            onRetry={handleRetry}
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (!analytics) {
    return (
      <PageWrapper
        title="Analytics"
        subtitle="Velocity, health, and ticket insights"
      >
        <PmPageShell>
          <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="chart"
              title="No analytics yet"
              description="Analytics will appear once your project has tickets."
            />
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Analytics"
      subtitle="Velocity, health, and ticket insights"
    >
      <PmPageShell>
        <PmSection index={0}>
          <AnalyticsKpiStrip analytics={analytics} />
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
      </PmPageShell>
    </PageWrapper>
  );
}

function ChartShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PmPanel className="p-4">
      <h3 className={`mb-3 text-sm font-semibold ${TEXT_ONE_LINE}`}>{title}</h3>
      {children}
    </PmPanel>
  );
}
