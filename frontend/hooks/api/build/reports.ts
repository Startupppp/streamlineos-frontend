"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

interface VelocitySprint {
  sprintId: number;
  name: string;
  startDate: string;
  endDate: string;
  committedPoints: number;
  completedPoints: number;
  committedCount: number;
  completedCount: number;
}

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

export function useVelocityReport(projectId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.projectReports.velocity(projectId),
    queryFn: ({ signal }) => apiClient.get<VelocitySprint[]>(`/build/${projectId}/reports/velocity`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useBurnupReport(projectId: number, sprintId?: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.projectReports.burnup(projectId, sprintId),
    queryFn: ({ signal }) =>
      apiClient.get<BurnupPoint[]>(
        `/build/${projectId}/reports/burnup`,
        sprintId ? { sprintId } : undefined, signal,
      ),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCfdReport(projectId: number, days = 30) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.projectReports.cfd(projectId, { days }),
    queryFn: ({ signal }) =>
      apiClient.get<CfdReport>(`/build/${projectId}/reports/cfd`, { days }, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCriticalPath(projectId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: queryKeys.projectReports.criticalPath(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<CriticalPathReport>(`/build/${projectId}/reports/critical-path`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCycleTimeReport(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<Array<{ week: string; avgDays: number; count: number }>>({
    queryKey: queryKeys.projectReports.cycleTime(projectId),
    queryFn: ({ signal }) => apiClient.get(`/build/${projectId}/reports/cycle-time`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useLeadTimeReport(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<Array<{ week: string; avgDays: number; p50Days: number; p90Days: number; count: number }>>({
    queryKey: queryKeys.projectReports.leadTime(projectId),
    queryFn: ({ signal }) => apiClient.get(`/build/${projectId}/reports/lead-time`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCaptureSnapshot(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "reports", "snapshot"],
    mutationFn: () =>
      apiClient.post<CaptureSnapshotResult>(`/build/${projectId}/reports/snapshot`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projectReports.cfd(projectId) });
    },
  });
}
