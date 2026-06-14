"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface VelocitySprint {
  sprintId: number;
  name: string;
  startDate: string;
  endDate: string;
  committedPoints: number;
  completedPoints: number;
  committedCount: number;
  completedCount: number;
}

export interface BurnupPoint {
  date: string;
  scope: number;
  completed: number;
}

export interface CfdSeriesPoint {
  date: string;
  backlog: number;
  unstarted: number;
  started: number;
  completed: number;
  cancelled: number;
}

export interface CfdReport {
  dates: string[];
  groups: string[];
  series: CfdSeriesPoint[];
}

export interface CaptureSnapshotResult {
  captured: number;
}

export function useVelocityReport(projectId: number) {
  return useQuery({
    queryKey: queryKeys.projectReports.velocity(projectId),
    queryFn: () => apiClient.get<VelocitySprint[]>(`/projects/${projectId}/reports/velocity`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useBurnupReport(projectId: number, sprintId?: number) {
  return useQuery({
    queryKey: queryKeys.projectReports.burnup(projectId, sprintId),
    queryFn: () =>
      apiClient.get<BurnupPoint[]>(
        `/projects/${projectId}/reports/burnup`,
        sprintId ? { sprintId } : undefined,
      ),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCfdReport(projectId: number, days = 30) {
  return useQuery({
    queryKey: queryKeys.projectReports.cfd(projectId, { days }),
    queryFn: () =>
      apiClient.get<CfdReport>(`/projects/${projectId}/reports/cfd`, { days }),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCaptureSnapshot(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<CaptureSnapshotResult>(`/projects/${projectId}/reports/snapshot`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.projectReports.all, "cfd", projectId] });
    },
  });
}
