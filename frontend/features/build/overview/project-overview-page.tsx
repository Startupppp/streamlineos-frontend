"use client";

import Link from "next/link";
import { useProject } from "@/hooks/api/build/projects";
import { useCycles, useProjectAnalytics } from "@/hooks/api/build/advanced";
import { useTicketColumnCounts } from "@/hooks/api/build/ticket-queries";
import { useProjectMilestones } from "@/hooks/api/build/milestones";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatShortDate } from "@/lib/date-utils";
import { EmptyState } from "@/components/ui/empty-state";
import { LayoutGrid, Target, Zap } from "lucide-react";

interface ProjectOverviewPageProps {
  projectId: number;
}

function ProjectOverviewSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6">
      <StatCardGridSkeleton cols={3} count={3} />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

export function ProjectOverviewPage({ projectId }: ProjectOverviewPageProps) {
  const projectQuery = useProject(projectId);
  const analyticsQuery = useProjectAnalytics(projectId);
  const cyclesQuery = useCycles(projectId);
  const columnCountsQuery = useTicketColumnCounts(projectId);
  const milestonesQuery = useProjectMilestones(projectId);

  const isLoading =
    projectQuery.isLoading ||
    analyticsQuery.isLoading ||
    cyclesQuery.isLoading ||
    columnCountsQuery.isLoading ||
    milestonesQuery.isLoading;

  const isError =
    projectQuery.isError ||
    analyticsQuery.isError ||
    cyclesQuery.isError ||
    columnCountsQuery.isError ||
    milestonesQuery.isError;

  const error =
    projectQuery.error ??
    analyticsQuery.error ??
    cyclesQuery.error ??
    columnCountsQuery.error ??
    milestonesQuery.error;

  const resolution = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: !projectQuery.data,
  });

  const project = projectQuery.data;
  const analytics = analyticsQuery.data;
  const cycles = cyclesQuery.data ?? [];
  const columnCounts = columnCountsQuery.data ?? {};
  const milestones = milestonesQuery.data?.data ?? [];

  const activeCycle = cycles.find((c) => c.status === "active");
  const nextMilestone = milestones
    .filter((m) => m.status === "PENDING")
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];

  const totalOpen = Object.values(columnCounts).reduce((sum, n) => sum + n, 0);
  const basePath = `/build/${projectId}`;

  function handleRetry() {
    void projectQuery.refetch();
    void analyticsQuery.refetch();
    void cyclesQuery.refetch();
    void columnCountsQuery.refetch();
    void milestonesQuery.refetch();
  }

  return (
    <PageWrapper
      badge={project?.key}
      title={project?.name ?? "Project overview"}
      subtitle={project?.description ?? undefined}
    >
      <PageState
        onRetry={handleRetry}
        resolution={resolution}
        className="flex-1 min-h-0"
        loading={<ProjectOverviewSkeleton />}
        empty={
          <EmptyState
            title="Project not found"
            description="This project may have been deleted or moved."
            className="flex-1"
          />
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <StatCardGrid cols={3}>
            <StatCard
              label="Open issues"
              value={totalOpen}
              icon={LayoutGrid}
              tone="blue"
              isLoading={columnCountsQuery.isLoading}
              href={`${basePath}/issues`}
            />
            <StatCard
              label="Active cycle"
              value={activeCycle ? activeCycle.name : "None"}
              icon={Zap}
              tone="violet"
              isLoading={cyclesQuery.isLoading}
              href={activeCycle ? `${basePath}/cycles` : undefined}
            />
            <StatCard
              label="Health"
              value={analytics?.healthStatus ?? "No data"}
              icon={Target}
              tone={
                analytics?.healthStatus === "healthy"
                  ? "emerald"
                  : analytics?.healthStatus === "at_risk"
                    ? "amber"
                    : "default"
              }
              isLoading={analyticsQuery.isLoading}
            />
          </StatCardGrid>

          <div className="grid gap-4 md:grid-cols-2">
            {Object.keys(columnCounts).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-semibold">Issues by status</h2>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(columnCounts).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground truncate">
                        {status}
                      </span>
                      <span className="font-mono tabular-nums font-medium">
                        {count}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {nextMilestone && (
              <Card>
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-semibold">Next milestone</h2>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium truncate">
                    {nextMilestone.name}
                  </p>
                  {nextMilestone.targetDate && (
                    <p className="text-label text-muted-foreground">
                      Due {formatShortDate(nextMilestone.targetDate)}
                    </p>
                  )}
                  <Badge
                    variant="outline"
                    className="h-5 px-2 py-0.5 text-micro"
                  >
                    {nextMilestone.status}
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`${basePath}/issues`}
              className="text-primary hover:underline"
            >
              Issues
            </Link>
            <Link
              href={`${basePath}/cycles`}
              className="text-primary hover:underline"
            >
              Cycles
            </Link>
            <Link
              href={`${basePath}/milestones`}
              className="text-primary hover:underline"
            >
              Milestones
            </Link>
          </div>
        </div>
      </PageState>
    </PageWrapper>
  );
}
