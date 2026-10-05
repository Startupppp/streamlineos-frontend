"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type { ProjectsReportsVelocityResponse } from "@/contracts/build-contracts.generated";
import { type FilterEnvelopeV1, encodeFilterEnvelope } from "@/lib/filter-envelope/filter-envelope-v1";

const velocityContract = lazyContract(() =>
  import("@/hooks/api/build/reports-schema").then((m) => m.velocityContract),
);
const burnupDataContract = lazyContract(() =>
  import("@/hooks/api/build/reports-schema").then((m) => m.burnupDataContract),
);
const cfdDataContract = lazyContract(() =>
  import("@/hooks/api/build/reports-schema").then((m) => m.cfdDataContract),
);
const criticalPathContract = lazyContract(() =>
  import("@/hooks/api/build/reports-schema").then((m) => m.criticalPathContract),
);
const cycleTimeContract = lazyContract(() =>
  import("@/hooks/api/build/reports-schema").then((m) => m.cycleTimeContract),
);
const leadTimeContract = lazyContract(() =>
  import("@/hooks/api/build/reports-schema").then((m) => m.leadTimeContract),
);
const snapshotResultContract = lazyContract(() =>
  import("@/hooks/api/build/reports-schema").then((m) => m.snapshotResultContract),
);

const timeBudgetContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.projectsReportsGetTimeBudgetResponseSchema),
);

interface BurnupPoint {
  date: string;
  scope: number;
  completed: number;
}

interface CfdSeriesPoint {
  date: string;
  backlog: number;
  unstarted: number;
  started: number;
  completed: number;
  cancelled: number;
}

interface CfdReport {
  dates: string[];
  groups: string[];
  series: CfdSeriesPoint[];
}

interface CaptureSnapshotResult {
  captured: number;
}

interface CriticalPathNode {
  ticketId: number;
  title: string;
  estimate: number;
  earliestStart: number;
  earliestFinish: number;
}

interface CriticalPathReport {
  criticalPath: CriticalPathNode[];
  totalDuration: number;
  nodeCount: number;
  edgeCount: number;
  hasCycle: boolean;
}

export function useVelocityReport(projectId: number, filterEnvelope?: FilterEnvelopeV1) {
  const canView = useCan("build:view");
  const encodedFilter = filterEnvelope !== undefined ? encodeFilterEnvelope(filterEnvelope) : undefined;
  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projectReports.velocityFiltered(projectId, encodedFilter),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<ProjectsReportsVelocityResponse>(
        `/build/${projectId}/reports/velocity`,
        {
          limit: 100,
          ...(pageParam !== undefined ? { cursor: pageParam } : {}),
          ...(encodedFilter !== undefined ? { filter: encodedFilter } : {}),
        },
        signal,
        velocityContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.hasMore ? (lastPage.pagination.nextCursor ?? undefined) : undefined,
    enabled: canView && !!projectId,
    staleTime: 2 * 60_000,
  });
}

export function useBurnupReport(projectId: number, cycleId?: number, filterEnvelope?: FilterEnvelopeV1) {
  const canView = useCan("build:view");
  const encodedFilter = filterEnvelope !== undefined ? encodeFilterEnvelope(filterEnvelope) : undefined;
  return useQuery({
    queryKey: buildWorkQueryKeys.projectReports.burnupFiltered(projectId, cycleId, encodedFilter),
    queryFn: ({ signal }) =>
      apiClient.get<BurnupPoint[]>(
        `/build/${projectId}/reports/burnup`,
        {
          ...(cycleId !== undefined ? { cycleId } : {}),
          ...(encodedFilter !== undefined ? { filter: encodedFilter } : {}),
        },
        signal,
        burnupDataContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 2 * 60_000,
  });
}

export function useCfdReport(projectId: number, days = 30) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projectReports.cfd(projectId, { days }),
    queryFn: ({ signal }) =>
      apiClient.get<CfdReport>(`/build/${projectId}/reports/cfd`, { days }, signal, cfdDataContract),
    enabled: canView && !!projectId,
    staleTime: 2 * 60_000,
  });
}

export function useCriticalPath(projectId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projectReports.criticalPath(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<CriticalPathReport>(`/build/${projectId}/reports/critical-path`, undefined, signal, criticalPathContract),
    enabled: canView && !!projectId,
    staleTime: 2 * 60_000,
  });
}

export function useCycleTimeReport(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<Array<{ week: string; avgDays: number; count: number }>>({
    queryKey: buildWorkQueryKeys.projectReports.cycleTime(projectId),
    queryFn: ({ signal }) => apiClient.get(`/build/${projectId}/reports/cycle-time`, undefined, signal, cycleTimeContract),
    enabled: canView && !!projectId,
    staleTime: 2 * 60_000,
  });
}

export function useLeadTimeReport(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<Array<{ week: string; avgDays: number; p50Days: number; p90Days: number; count: number }>>({
    queryKey: buildWorkQueryKeys.projectReports.leadTime(projectId),
    queryFn: ({ signal }) => apiClient.get(`/build/${projectId}/reports/lead-time`, undefined, signal, leadTimeContract),
    enabled: canView && !!projectId,
    staleTime: 2 * 60_000,
  });
}

export function useCaptureSnapshot(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "reports", "snapshot"],
    mutationFn: () =>
      apiClient.post<CaptureSnapshotResult>(`/build/${projectId}/reports/snapshot`, undefined, undefined, snapshotResultContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projectReports.cfd(projectId) });
    },
  });
}

export function useProjectTimeBudget(
  projectId: number,
  from: string,
  to: string,
) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.analytics(projectId, { from, to, _key: "time-budget" }),
    queryFn: ({ signal }) =>
      apiClient.get(`/build/${projectId}/analytics/time-budget`, { from, to }, signal, timeBudgetContract),
    enabled: canView && !!projectId && !!from && !!to,
    staleTime: 60_000,
  });
}
