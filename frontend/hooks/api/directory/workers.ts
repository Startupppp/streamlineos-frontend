"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  CreateEngagementInput,
  CreateWorkerInput,
  TerminateEngagementInput,
  UpdateEngagementInput,
  Worker,
  WorkerEngagement,
  WorkersPage,
} from "@/types/directory/workers";

export interface UseWorkersParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export function useWorkers(params: UseWorkersParams = {}) {
  const canView = useCan("workforce:workers:view");
  const { page = 1, limit = 20, status, search } = params;
  const queryParams: Record<string, unknown> = { page, limit };
  if (status) queryParams.status = status;
  if (search) queryParams.search = search;

  return useQuery({
    queryKey: queryKeys.directory.workers(queryParams),
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) searchParams.set("status", status);
      if (search) searchParams.set("search", search);
      return apiClient.get<WorkersPage>(`/directory/workers?${searchParams.toString()}`);
    },
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useWorker(workerId: string) {
  const canView = useCan("workforce:workers:view");
  return useQuery({
    queryKey: queryKeys.directory.worker(workerId),
    queryFn: () => apiClient.get<Worker>(`/directory/workers/${workerId}`),
    staleTime: 60_000,
    enabled: canView && !!workerId,
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "workers", "create"],
    mutationFn: (input: CreateWorkerInput) =>
      apiClient.post<Worker>("/directory/workers", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.directory.workers() });
    },
  });
}

export function useWorkerEngagements(workerId: string) {
  const canView = useCan("workforce:workers:view");
  return useQuery({
    queryKey: queryKeys.directory.engagements(workerId),
    queryFn: () =>
      apiClient.get<WorkerEngagement[]>(`/directory/workers/${workerId}/engagements`),
    staleTime: 60_000,
    enabled: canView && !!workerId,
  });
}

export function useCreateEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "engagements", "create"],
    mutationFn: ({ workerId, ...input }: CreateEngagementInput) =>
      apiClient.post<WorkerEngagement>(
        `/directory/workers/${workerId}/engagements`,
        { ...input, workerId },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.directory.engagements(variables.workerId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.directory.worker(variables.workerId),
      });
    },
  });
}

export function useUpdateEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "engagements", "update"],
    mutationFn: ({
      workerEngagementId,
      workerId,
      ...input
    }: UpdateEngagementInput & { workerEngagementId: string; workerId: string }) =>
      apiClient.patch<WorkerEngagement>(
        `/directory/engagements/${workerEngagementId}`,
        input,
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.directory.engagements(variables.workerId),
      });
    },
  });
}

export function useTerminateEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "engagements", "terminate"],
    mutationFn: ({
      workerEngagementId,
      workerId: _workerId,
      ...input
    }: TerminateEngagementInput & { workerEngagementId: string; workerId: string }) =>
      apiClient.post<WorkerEngagement>(
        `/directory/engagements/${workerEngagementId}/terminate`,
        input,
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.directory.engagements(variables.workerId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.directory.worker(variables.workerId),
      });
    },
  });
}
