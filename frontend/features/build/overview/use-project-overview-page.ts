"use client";

import { useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api/build/projects";
import { useCycles } from "@/hooks/api/build/cycles";
import { useProjectAnalytics, type ProjectAnalyticsParams } from "@/hooks/api/build/project-analytics";
import { useTicketColumnCounts } from "@/hooks/api/build/ticket-queries";
import { useProjectMilestones } from "@/hooks/api/build/milestones";
import { useReleases } from "@/hooks/api/build/releases";
import { useProjectActivity } from "@/hooks/api/build/project-activity";
import { usePageState } from "@/hooks/api/use-page-state";

function isAnalyticsRange(v: string | null): v is "7d" | "30d" | "90d" {
  return v === "7d" || v === "30d" || v === "90d";
}

export function useProjectOverviewPage(projectId: number) {
  const searchParams = useSearchParams();
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
    .sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""))[0];
  const nextRelease = releases
    .filter((r) => r.status === "draft")
    .sort((a, b) => {
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return a.releaseDate.localeCompare(b.releaseDate);
    })[0];

  const totalOpen = analytics?.healthBreakdown?.openTickets ?? null;
  const completionPct = analytics?.healthBreakdown?.completionPct ?? null;
  const overdueCount = analytics?.healthBreakdown?.overdueTickets ?? null;

  function handleRetry() {
    void projectQuery.refetch();
    void analyticsQuery.refetch();
    void cyclesQuery.refetch();
    void columnCountsQuery.refetch();
    void milestonesQuery.refetch();
    void releasesQuery.refetch();
    void activityQuery.refetch();
  }

  return {
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
    activityData: activityQuery.data,
    isAnalyticsLoading: analyticsQuery.isLoading,
    isCyclesLoading: cyclesQuery.isLoading,
    handleRetry,
  };
}
