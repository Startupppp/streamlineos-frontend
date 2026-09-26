"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api/build/projects";
import { useCycles, useProjectAnalytics, type ProjectAnalyticsParams } from "@/hooks/api/build/advanced";
import { useTicketColumnCounts } from "@/hooks/api/build/ticket-queries";
import { useProjectMilestones } from "@/hooks/api/build/milestones";
import { useReleases } from "@/hooks/api/build/releases";
import { useProjectActivity } from "@/hooks/api/build/project-activity";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
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
import { AlertTriangle, Activity, LayoutGrid, Target, TrendingUp, Zap } from "lucide-react";

function isAnalyticsRange(v: string | null): v is "7d" | "30d" | "90d" {
  return v === "7d" || v === "30d" || v === "90d";
}

interface ProjectOverviewPageProps {
  projectId: number;
}

function ProjectOverviewSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6">
      <StatCardGridSkeleton cols={5} count={5} />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

export function ProjectOverviewPage({ projectId }: ProjectOverviewPageProps) {
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();

  const rawRange = searchParams.get("range");
  const rawTeamId = searchParams.get("teamId");
  const rawOwnerId = searchParams.get("ownerId");

  const analyticsParams: ProjectAnalyticsParams | undefined = (() => {
    const p: ProjectAnalyticsParams = {};
    if (isAnalyticsRange(rawRange)) p.range = rawRange;
    const teamIdNum = rawTeamId !== null ? parseInt(rawTeamId, 10) : NaN;
    if (!isNaN(teamIdNum) && teamIdNum > 0) p.teamId = teamIdNum;
    if (rawOwnerId !== null && rawOwnerId.length > 0) p.ownerId = rawOwnerId;
    return Object.keys(p).length > 0 ? p : undefined;
  })();

  const projectQuery = useProject(projectId);
  const analyticsQuery = useProjectAnalytics(projectId, analyticsParams);
  const cyclesQuery = useCycles(projectId);
  const columnCountsQuery = useTicketColumnCounts(projectId);
  const milestonesQuery = useProjectMilestones(projectId);
  const releasesQuery = useReleases(projectId);
  const activityQuery = useProjectActivity(projectId);

  const isLoading =
    projectQuery.isLoading ||
    analyticsQuery.isLoading ||
    cyclesQuery.isLoading ||
    columnCountsQuery.isLoading ||
    milestonesQuery.isLoading ||
    releasesQuery.isLoading;

  const isError =
    projectQuery.isError ||
    analyticsQuery.isError ||
    cyclesQuery.isError ||
    columnCountsQuery.isError ||
    milestonesQuery.isError ||
    releasesQuery.isError ||
    activityQuery.isError;

  const error =
    projectQuery.error ??
    analyticsQuery.error ??
    cyclesQuery.error ??
    columnCountsQuery.error ??
    milestonesQuery.error ??
    releasesQuery.error ??
    activityQuery.error;

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
  const releases = releasesQuery.data?.data ?? [];

  const activeCycle = cycles.find((c) => c.status === "active");
  const nextMilestone = milestones
    .filter((m) => m.status === "PENDING")
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
  const nextRelease = releases
    .filter((r) => r.status === "draft")
    .sort((a, b) => {
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return a.releaseDate.localeCompare(b.releaseDate);
    })[0];

  const totalOpen = Object.values(columnCounts).reduce((sum, n) => sum + n, 0);
  const completionPct = analytics?.healthBreakdown?.completionPct ?? null;
  const overdueCount = analytics?.healthBreakdown?.overdueTickets ?? null;
  const basePath = `/build/${projectId}`;

  function handleRetry() {
    void projectQuery.refetch();
    void analyticsQuery.refetch();
    void cyclesQuery.refetch();
    void columnCountsQuery.refetch();
    void milestonesQuery.refetch();
    void releasesQuery.refetch();
    void activityQuery.refetch();
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
          {!isOnline && (
            <p className="text-sm text-muted-foreground px-4 py-2 bg-muted/50 rounded-md">
              You're offline — results may not be up to date
            </p>
          )}

          <StatCardGrid cols={5}>
            <StatCard
              label="Open issues"
              value={totalOpen}
              icon={LayoutGrid}
              tone="blue"
              isLoading={columnCountsQuery.isLoading}
              href={`${basePath}/issues`}
            />
            <StatCard
              label="Progress"
              value={completionPct !== null ? `${completionPct}%` : "No data"}
              icon={TrendingUp}
              tone={
                completionPct !== null && completionPct >= 70
                  ? "emerald"
                  : completionPct !== null && completionPct >= 40
                    ? "amber"
                    : "default"
              }
              isLoading={analyticsQuery.isLoading}
            />
            <StatCard
              label="Overdue"
              value={overdueCount !== null ? overdueCount : "—"}
              icon={AlertTriangle}
              tone={overdueCount !== null && overdueCount > 0 ? "amber" : "default"}
              isLoading={analyticsQuery.isLoading}
              href={overdueCount !== null && overdueCount > 0 ? `${basePath}/issues` : undefined}
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
                analytics?.healthStatus === "EXCELLENT"
                  ? "emerald"
                  : analytics?.healthStatus === "GOOD"
                    ? "amber"
                    : analytics?.healthStatus === "AT_RISK" || analytics?.healthStatus === "CRITICAL"
                      ? "red"
                      : "default"
              }
              isLoading={analyticsQuery.isLoading}
            />
          </StatCardGrid>

          <div className="grid gap-4 md:grid-cols-3">
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

            {nextRelease && (
              <Card>
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-semibold">Next release</h2>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium truncate">
                    {nextRelease.name}
                  </p>
                  {nextRelease.releaseDate && (
                    <p className="text-label text-muted-foreground">
                      Planned {formatShortDate(nextRelease.releaseDate)}
                    </p>
                  )}
                  <Badge
                    variant="outline"
                    className="h-5 px-2 py-0.5 text-micro"
                  >
                    {nextRelease.version}
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>

          {activityQuery.data && activityQuery.data.data.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  Recent activity
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityQuery.data.data.map((item) => (
                  <div key={item.id} className="flex flex-col gap-0.5 text-sm">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-medium">
                        {item.user?.name ?? "System"}
                      </span>
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-muted-foreground">on</span>
                      <span className="font-medium truncate max-w-[200px]">
                        {item.projectKey}-{item.ticketNumber}
                      </span>
                      <span className="truncate max-w-[200px] text-muted-foreground">
                        {item.ticketTitle}
                      </span>
                    </div>
                    <span className="text-micro text-muted-foreground">
                      {formatShortDate(item.createdAt)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
