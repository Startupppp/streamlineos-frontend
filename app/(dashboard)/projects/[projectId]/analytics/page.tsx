"use client";

import { use, useMemo, useState } from "react";
import {
  useProjectAnalytics,
  useSprints,
  useSprintBurndown,
} from "@/lib/api/hooks/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { Sprint, SprintBurndownPoint } from "@/types/projects";
import { ProjectStats } from "@/features/projects/analytics/project-stats";
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
  CHART_COLORS,
} from "@/features/projects/analytics/project-charts";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

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
    return analytics.stateDistribution.map(
      (row: { status: string | null; count: number }) => {
        const state = row.status ?? "unknown";
        return {
          state: state
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase()),
          count: row.count,
          fill: STATE_COLORS[state.toLowerCase()] ?? "#94a3b8",
        };
      }
    );
  }, [analytics?.stateDistribution]);

  const priorityData = useMemo(() => {
    if (!analytics?.priorityBreakdown) return [];
    return analytics.priorityBreakdown.map(
      (row: { priority: string | null; count: number }) => {
        const priority = row.priority ?? "none";
        return {
          name: priority.charAt(0).toUpperCase() + priority.slice(1),
          value: row.count,
          fill: PRIORITY_COLORS[priority.toLowerCase()] ?? "#94a3b8",
        };
      }
    );
  }, [analytics?.priorityBreakdown]);

  const volumeData = useMemo(() => {
    if (!analytics?.volumeOverTime) return [];
    return analytics.volumeOverTime.map(
      (entry: { week: string | null; count: number }) => ({
        date: entry.week ?? "",
        created: entry.count,
      })
    );
  }, [analytics?.volumeOverTime]);

  const assigneeData = useMemo(() => {
    if (!analytics?.assigneeCompletion) return [];
    return analytics.assigneeCompletion.map(
      (entry: {
        assigneeId: string | null;
        assigneeName: string | null;
        total: number;
        completed: number;
      }) => ({
        name: entry.assigneeName ?? "Unassigned",
        completed: entry.completed,
        total: entry.total,
        rate:
          entry.total > 0
            ? Math.round((entry.completed / entry.total) * 100)
            : 0,
      })
    );
  }, [analytics?.assigneeCompletion]);

  const velocityData = useMemo(() => {
    if (!analytics?.cycleVelocity) return [];
    return analytics.cycleVelocity.map(
      (entry: {
        cycleId: number;
        cycleName: string | null;
        completedPoints: number;
      }) => ({
        cycle: entry.cycleName ?? `Cycle ${entry.cycleId}`,
        points: entry.completedPoints,
      })
    );
  }, [analytics?.cycleVelocity]);

  const burndownChartData = useMemo(() => {
    if (!burndownData) return [];
    const idealMap = new Map(
      burndownData.idealBurndown.map((p: SprintBurndownPoint) => [
        typeof p.date === "string"
          ? p.date.slice(0, 10)
          : new Date(p.date).toISOString().slice(0, 10),
        p.points,
      ])
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
    return analytics.estimateVsActual.map(
      (entry: {
        ticketId: number;
        title: string;
        estimated: string | null;
        actual: number;
      }) => ({
        label: entry.title || `#${entry.ticketId}`,
        estimate: entry.estimated ? parseFloat(entry.estimated) : 0,
        actual: entry.actual,
      })
    );
  }, [analytics?.estimateVsActual]);

  const healthScore = (
    analytics as { healthScore?: number } | undefined
  )?.healthScore;
  const healthStatus = (
    analytics as { healthStatus?: string } | undefined
  )?.healthStatus;
  const healthBreakdown = (
    analytics as {
      healthBreakdown?: {
        completionPct: number;
        onTimePct: number;
        velocityScore: number;
        overdueTickets: number;
        totalTickets: number;
      };
    } | undefined
  )?.healthBreakdown;

  if (isLoading) {
    return (
      <PageWrapper title="Analytics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_: unknown, i: number) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (!analytics) {
    return (
      <PageWrapper title="Analytics">
        <div className="flex flex-col items-center justify-center py-16">
          <EmptyActivityIllustration className="mx-auto mb-4 w-36 h-36" />
          <h3 className="text-lg font-semibold mb-1">No data yet</h3>
          <p className="text-sm text-muted-foreground">
            Analytics will appear once your project has work items.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Analytics">
      <ProjectStats
        healthScore={healthScore}
        healthStatus={healthStatus}
        healthBreakdown={healthBreakdown}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">State Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <StateDistributionChart data={stateData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <PriorityBreakdownChart data={priorityData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <VolumeOverTimeChart data={volumeData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Completion Rate by Assignee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssigneeCompletionChart data={assigneeData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cycle Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <CycleVelocityChart data={velocityData} />
          </CardContent>
        </Card>

        <SprintBurndownChart
          data={burndownChartData}
          sprints={sprints}
          sprintId={sprintId}
          onSprintChange={setSelectedSprintId}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimate vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <EstimateVsActualChart data={estimateData} />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
