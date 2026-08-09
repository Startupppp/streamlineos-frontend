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
  organizationPersonId?: string;
}

export function useWorkers(params: UseWorkersParams = {}) {
  const canView = useCan("workforce:workers:view");
  const { page = 1, limit = 20, status, search, organizationPersonId } = params;
  const queryParams: Record<string, unknown> = { page, limit };
  if (status) queryParams.status = status;
  if (search) queryParams.search = search;
  if (organizationPersonId) queryParams.organizationPersonId = organizationPersonId;

  return useQuery({
    queryKey: queryKeys.directory.workers(queryParams),
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) searchParams.set("status", status);
      if (search) searchParams.set("search", search);
      if (organizationPersonId) searchParams.set("organizationPersonId", organizationPersonId);
      return apiClient.get<WorkersPage>(`/directory/workers?${searchParams.toString()}`);
    },
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "workers", "create"],
    mutationFn: (input: CreateWorkerInput) =>
      apiClient.post<Worker>("/directory/workers", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.directory.workersAll });
      qc.invalidateQueries({ queryKey: queryKeys.directory.peopleAll });
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
    onSuccess: (created, variables) => {
      qc.setQueryData<WorkerEngagement[]>(
        queryKeys.directory.engagements(variables.workerId),
        (old) => (old ? [...old, created] : old),
      );
      qc.invalidateQueries({
        queryKey: queryKeys.directory.engagements(variables.workerId),
        refetchType: "none",
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
      workerId: _workerId,
      ...input
    }: UpdateEngagementInput) =>
      apiClient.patch<WorkerEngagement>(
        "/directory/engagements/" + workerEngagementId,
        input,
      ),
    onSuccess: (updated, variables) => {
      qc.setQueryData<WorkerEngagement[]>(
        queryKeys.directory.engagements(variables.workerId),
        (old) =>
          old?.map((engagement) =>
            engagement.workerEngagementId === variables.workerEngagementId
              ? { ...engagement, ...updated }
              : engagement,
          ),
      );
      qc.invalidateQueries({
        queryKey: queryKeys.directory.worker(variables.workerId),
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
      ...input
    }: TerminateEngagementInput & { workerEngagementId: string; workerId: string }) =>
      apiClient.post<WorkerEngagement>(
        `/directory/engagements/${workerEngagementId}/terminate`,
        input,
      ),
    onSuccess: (updated, variables) => {
      qc.setQueryData<WorkerEngagement[]>(
        queryKeys.directory.engagements(variables.workerId),
        (old) =>
          old?.map((e) =>
            e.workerEngagementId === variables.workerEngagementId
              ? { ...e, ...updated }
              : e,
          ),
      );
      qc.invalidateQueries({
        queryKey: queryKeys.directory.worker(variables.workerId),
      });
    },
  });
}

export function useCancelEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["directory", "engagements", "cancel"],
    mutationFn: ({
      workerEngagementId,
    }: {
      workerEngagementId: string;
      workerId: string;
    }) =>
      apiClient.post<WorkerEngagement>(
        `/directory/engagements/${workerEngagementId}/cancel`,
      ),
    onSuccess: (updated, variables) => {
      qc.setQueryData<WorkerEngagement[]>(
        queryKeys.directory.engagements(variables.workerId),
        (old) =>
          old?.map((engagement) =>
            engagement.workerEngagementId === variables.workerEngagementId
              ? { ...engagement, ...updated }
              : engagement,
          ),
      );
      qc.invalidateQueries({
        queryKey: queryKeys.directory.worker(variables.workerId),
      });
    },
  });
}
