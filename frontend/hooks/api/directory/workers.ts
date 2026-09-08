"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { workersListParams } from "@/lib/query-keys/directory-workers-list";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  workerContract,
  workerEngagementContract,
  workerEngagementListContract,
  workersPageContract,
} from "@/hooks/api/directory/workers-schema";
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
  cursor?: string;
  limit?: number;
  status?: string;
  search?: string;
  organizationPersonId?: string;
}

export function useWorkers(params: UseWorkersParams = {}) {
  const canView = useCan("directory:workers:view");
  const { cursor, limit = 20, status, search, organizationPersonId } = params;
  const queryParams = workersListParams(params);

  return useQuery<WorkersPage, Error>({
    queryKey: directoryAndOwnershipQueryKeys.directory.workers(queryParams),
    queryFn: ({ signal }) => {
      const searchParams = new URLSearchParams({
        limit: String(limit),
      });
      if (cursor) searchParams.set("cursor", cursor);
      if (status) searchParams.set("status", status);
      if (search) searchParams.set("search", search);
      if (organizationPersonId) searchParams.set("organizationPersonId", organizationPersonId);
      return apiClient.get(`/directory/workers?${searchParams.toString()}`, undefined, signal, workersPageContract);
    },
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  return useAuthorizedMutation("directory:workers:manage", {
    mutationKey: ["directory", "workers", "create"],
    mutationFn: (input: CreateWorkerInput) =>
      apiClient.post<Worker>("/directory/workers", input, undefined, workerContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.directory.workersAll });
      qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.directory.peopleAll });
    },
  });
}

export function useWorkerEngagements(workerId: string) {
  const canView = useCan("directory:workers:view");
  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.directory.engagements(workerId),
    queryFn: ({ signal }) =>
      apiClient.get<WorkerEngagement[]>(
        `/directory/workers/${workerId}/engagements`,
        undefined,
        signal,
        workerEngagementListContract,
      ),
    staleTime: 60_000,
    enabled: canView && !!workerId,
  });
}

export function useCreateEngagement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("directory:workers:manage", {
    mutationKey: ["directory", "engagements", "create"],
    mutationFn: ({ workerId, ...input }: CreateEngagementInput) =>
      apiClient.post<WorkerEngagement>(
        `/directory/workers/${workerId}/engagements`,
        { ...input, workerId },
        undefined,
        workerEngagementContract,
      ),
    onSuccess: (created, variables) => {
      qc.setQueryData<WorkerEngagement[]>(
        directoryAndOwnershipQueryKeys.directory.engagements(variables.workerId),
        (old) => (old ? [...old, created] : old),
      );
      qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.directory.engagements(variables.workerId),
        refetchType: "none",
      });
      qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.directory.worker(variables.workerId),
      });
    },
  });
}

export function useUpdateEngagement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("directory:workers:manage", {
    mutationKey: ["directory", "engagements", "update"],
    mutationFn: ({
      workerEngagementId,
      workerId: _workerId,
      ...input
    }: UpdateEngagementInput) =>
      apiClient.patch<WorkerEngagement>(
        `/directory/engagements/${workerEngagementId}`,
        input,
        undefined,
        workerEngagementContract,
      ),
    onSuccess: (updated, variables) => {
      qc.setQueryData<WorkerEngagement[]>(
        directoryAndOwnershipQueryKeys.directory.engagements(variables.workerId),
        (old) =>
          old?.map((engagement) =>
            engagement.workerEngagementId === variables.workerEngagementId
              ? { ...engagement, ...updated }
              : engagement,
          ),
      );
      qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.directory.worker(variables.workerId),
      });
    },
  });
}

export function useTerminateEngagement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("directory:workers:terminate", {
    mutationKey: ["directory", "engagements", "terminate"],
    mutationFn: ({
      workerEngagementId,
      workerId: _workerId,
      ...input
    }: TerminateEngagementInput & { workerEngagementId: string; workerId: string }) =>
      apiClient.post<WorkerEngagement>(
        `/directory/engagements/${workerEngagementId}/terminate`,
        input,
        undefined,
        workerEngagementContract,
      ),
    onSuccess: (updated, variables) => {
      qc.setQueryData<WorkerEngagement[]>(
        directoryAndOwnershipQueryKeys.directory.engagements(variables.workerId),
        (old) =>
          old?.map((e) =>
            e.workerEngagementId === variables.workerEngagementId
              ? { ...e, ...updated }
              : e,
          ),
      );
      qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.directory.worker(variables.workerId),
      });
    },
  });
}

export function useCancelEngagement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("directory:workers:manage", {
    mutationKey: ["directory", "engagements", "cancel"],
    mutationFn: ({
      workerEngagementId,
    }: {
      workerEngagementId: string;
      workerId: string;
    }) =>
      apiClient.post<WorkerEngagement>(
        `/directory/engagements/${workerEngagementId}/cancel`,
        undefined,
        undefined,
        workerEngagementContract,
      ),
    onSuccess: (updated, variables) => {
      qc.setQueryData<WorkerEngagement[]>(
        directoryAndOwnershipQueryKeys.directory.engagements(variables.workerId),
        (old) =>
          old?.map((engagement) =>
            engagement.workerEngagementId === variables.workerEngagementId
              ? { ...engagement, ...updated }
              : engagement,
          ),
      );
      qc.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.directory.worker(variables.workerId),
      });
    },
  });
}
