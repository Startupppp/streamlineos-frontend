"use client";

import Link from "next/link";
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
import { useProjectOverviewPage } from "./use-project-overview-page";

function formatOverviewLabel(value: string): string {
  const words = value.toLowerCase().split(/[_\s]+/).filter(Boolean);
  if (words.length === 0) return value;
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
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
  const {
    resolution,
    project,
    analytics,
    columnCounts,
    activeCycle,
    nextMilestone,
    nextRelease,
    totalOpen,
    completionPct,
    overdueCount,
    activityData,
    isAnalyticsLoading,
    isCyclesLoading,
    isOnline,
    handleRetry,
  } = useProjectOverviewPage(projectId);

  const basePath = `/build/${projectId}`;

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
            illustrationPreset="projects"
            title="Project not found"
            description="This project may have been deleted or moved."
            className="min-h-full w-full flex-1"
          />
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          {!isOnline && (
            <p className="text-sm text-muted-foreground px-4 py-2 bg-muted/50 rounded-md">
              You&apos;re offline — results may not be up to date
            </p>
          )}

          <StatCardGrid cols={5}>
            <StatCard
              label="Open issues"
              value={totalOpen !== null ? totalOpen : "—"}
              icon={LayoutGrid}
              tone="blue"
              isLoading={isAnalyticsLoading}
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
              isLoading={isAnalyticsLoading}
            />
            <StatCard
              label="Overdue"
              value={overdueCount !== null ? overdueCount : "—"}
              icon={AlertTriangle}
              tone={overdueCount !== null && overdueCount > 0 ? "amber" : "default"}
              isLoading={isAnalyticsLoading}
              href={overdueCount !== null && overdueCount > 0 ? `${basePath}/issues` : undefined}
            />
            <StatCard
              label="Active cycle"
              value={activeCycle ? activeCycle.name : "None"}
              icon={Zap}
              tone="violet"
              isLoading={isCyclesLoading}
              href={activeCycle ? `${basePath}/cycles` : undefined}
            />
            <StatCard
              label="Health"
              value={
                analytics?.healthStatus
                  ? formatOverviewLabel(analytics.healthStatus)
                  : "No data"
              }
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
              isLoading={isAnalyticsLoading}
            />
          </StatCardGrid>

          <div className="grid gap-4 md:grid-cols-3">
            {Object.keys(columnCounts).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-medium">Issues by status</h2>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(columnCounts).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground truncate">
                        {formatOverviewLabel(status)}
                      </span>
                      <span className="font-mono tabular-nums font-normal">
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
                  <h2 className="text-sm font-medium">Next milestone</h2>
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
                    {formatOverviewLabel(nextMilestone.status ?? "Unknown")}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {nextRelease && (
              <Card>
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-medium">Next release</h2>
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

          {activityData && activityData.data.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  Recent activity
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityData.data.map((item) => (
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
