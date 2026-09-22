"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


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

interface VelocitySprint {
  cycleId: number;
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
    queryKey: accountingAndSupportQueryKeys.projectReports.velocity(projectId),
    queryFn: ({ signal }) => apiClient.get<VelocitySprint[]>(`/build/${projectId}/reports/velocity`, undefined, signal, velocityContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useBurnupReport(projectId: number, cycleId?: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: accountingAndSupportQueryKeys.projectReports.burnup(projectId, cycleId),
    queryFn: ({ signal }) =>
      apiClient.get<BurnupPoint[]>(
        `/build/${projectId}/reports/burnup`,
        cycleId ? { cycleId } : undefined,
        signal,
        burnupDataContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCfdReport(projectId: number, days = 30) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: accountingAndSupportQueryKeys.projectReports.cfd(projectId, { days }),
    queryFn: ({ signal }) =>
      apiClient.get<CfdReport>(`/build/${projectId}/reports/cfd`, { days }, signal, cfdDataContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCriticalPath(projectId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: accountingAndSupportQueryKeys.projectReports.criticalPath(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<CriticalPathReport>(`/build/${projectId}/reports/critical-path`, undefined, signal, criticalPathContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCycleTimeReport(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<Array<{ week: string; avgDays: number; count: number }>>({
    queryKey: accountingAndSupportQueryKeys.projectReports.cycleTime(projectId),
    queryFn: ({ signal }) => apiClient.get(`/build/${projectId}/reports/cycle-time`, undefined, signal, cycleTimeContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useLeadTimeReport(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<Array<{ week: string; avgDays: number; p50Days: number; p90Days: number; count: number }>>({
    queryKey: accountingAndSupportQueryKeys.projectReports.leadTime(projectId),
    queryFn: ({ signal }) => apiClient.get(`/build/${projectId}/reports/lead-time`, undefined, signal, leadTimeContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCaptureSnapshot(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "reports", "snapshot"],
    mutationFn: () =>
      apiClient.post<CaptureSnapshotResult>(`/build/${projectId}/reports/snapshot`, undefined, undefined, snapshotResultContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.projectReports.cfd(projectId) });
    },
  });
}
