"use client";

import { use, useMemo, useState } from "react";
import {
  useProjectAnalytics,
  useSprints,
  useSprintBurndown,
} from "@/hooks/api/projects";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Sprint, SprintBurndownPoint } from "@/types/projects";
import {
  AnalyticsKpiStrip,
  AnalyticsKpiStripSkeleton,
} from "@/features/projects/analytics/analytics-kpi-strip";
import {
  StateDistributionChart,
  PriorityBreakdownChart,
  VolumeOverTimeChart,
  AssigneeCompletionChart,
  CycleVelocityChart,
  SprintBurndownChart,
  EstimateVsActualChart,
  STATE_COLORS,
  PRIORITY_COLORS,
} from "@/features/projects/analytics/project-charts";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr, 10);

  const { data: analytics, isLoading } = useProjectAnalytics(projectId);
  const { data: sprints } = useSprints(projectId);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  const activeSprint = useMemo(() => {
    if (!sprints || sprints.length === 0) return null;
    const active = sprints.find((s: Sprint) => s.status === "ACTIVE");
    return active ?? sprints[sprints.length - 1];
  }, [sprints]);

  const sprintId = selectedSprintId ?? activeSprint?.id ?? 0;
  const { data: burndownData } = useSprintBurndown(projectId, sprintId);

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
      cycle: entry.cycleName ?? `Cycle ${entry.cycleId}`,
      points: entry.completedPoints,
    }));
  }, [analytics?.cycleVelocity]);

  const burndownChartData = useMemo(() => {
    if (!burndownData) return [];
    const idealMap = new Map(
      burndownData.idealBurndown.map((p: SprintBurndownPoint) => [
        typeof p.date === "string"
          ? p.date.slice(0, 10)
          : new Date(p.date).toISOString().slice(0, 10),
        p.points,
      ]),
    );
    return burndownData.actualBurndown.map((p: SprintBurndownPoint) => {
      const dateKey =
        typeof p.date === "string"
          ? p.date.slice(0, 10)
          : new Date(p.date).toISOString().slice(0, 10);
      return {
        date: dateKey,
        remaining: Math.max(0, p.points),
        ideal: Math.max(0, idealMap.get(dateKey) ?? 0),
      };
    });
  }, [burndownData]);

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
        eyebrow="Project"
        subtitle="Velocity, health, and ticket insights"
      >
        <AnalyticsKpiStripSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[296px] w-full rounded-xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (!analytics) {
    return (
      <PageWrapper
        title="Analytics"
        eyebrow="Project"
        subtitle="Velocity, health, and ticket insights"
      >
        <EmptyState
          illustrationPreset="chart"
          title="No analytics yet"
          description="Analytics will appear once your project has tickets."
          className="flex-1 min-h-[50vh]"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Analytics"
      eyebrow="Project"
      subtitle="Velocity, health, and ticket insights"
    >
      <AnalyticsKpiStrip analytics={analytics} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

        <SprintBurndownChart
          data={burndownChartData}
          sprints={sprints}
          sprintId={sprintId}
          onSprintChange={setSelectedSprintId}
        />
      </div>
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
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>
    </Card>
  );
}
