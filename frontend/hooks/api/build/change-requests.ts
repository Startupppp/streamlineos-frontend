"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  ChangeRequest,
  CreateChangeRequestInput,
  UpdateChangeRequestInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


const changeRequestListContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.changeRequestListContract),
);
const changeRequestRowContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-schema").then((m) => m.changeRequestRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

interface CrFilters {
  status?: string;
}

export function useChangeRequests(projectId: number, filters?: CrFilters) {
  const canView = useCan("build:changerequests:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;

  return useQuery<ChangeRequest[]>({
    queryKey: buildWorkQueryKeys.projects.changeRequests.list(
      projectId,
      filters?.status ? { status: filters.status } : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<ChangeRequest[]>(`/build/${projectId}/change-requests`, params, signal, changeRequestListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateChangeRequest(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:changerequests:create", {
    mutationKey: ["projects", projectId, "change-requests", "create"],
    mutationFn: (data: CreateChangeRequestInput) =>
      apiClient.post<ChangeRequest>(`/build/${projectId}/change-requests`, data, undefined, changeRequestRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.changeRequests.list(projectId) });
    },
  });
}

export function useUpdateChangeRequest(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:changerequests:manage", {
    mutationKey: ["projects", projectId, "change-requests", "update"],
    mutationFn: ({ id, ...data }: UpdateChangeRequestInput & { id: number }) =>
      apiClient.patch<ChangeRequest>(`/build/${projectId}/change-requests/${id}`, data, undefined, changeRequestRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.changeRequests.list(projectId) });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.changeRequests.detail(projectId, vars.id),
      });
    },
  });
}

export function useDeleteChangeRequest(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:changerequests:manage", {
    mutationKey: ["projects", projectId, "change-requests", "delete"],
    mutationFn: (crId: number) =>
      apiClient.delete<void>(`/build/${projectId}/change-requests/${crId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.changeRequests.list(projectId) });
    },
  });
}
