"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { Bug, CreateBugInput, UpdateBugInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

type BugFilters = {
  status?: string;
  severity?: string;
  assigneeId?: string;
  q?: string;
};

export function useBugs(projectId?: number, filters?: BugFilters) {
  const canView = useCan("build:bugs:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.severity) params["severity"] = filters.severity;
  if (filters?.assigneeId) params["assigneeId"] = filters.assigneeId;
  if (filters?.q) params["q"] = filters.q;

  return useQuery<Bug[]>({
    queryKey: queryKeys.projects.bugs.list(projectId, filters),
    queryFn: ({ signal }) => apiClient.get<Bug[]>(`/build/${projectId}/bugs`, params, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateBug() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:bugs:create", {
    mutationKey: ["projects", "bugs", "create"],
    mutationFn: ({ projectId, ...data }: CreateBugInput & { projectId: number }) =>
      apiClient.post<Bug>(`/build/${projectId}/bugs`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.bugs.list(vars.projectId) });
    },
  });
}

export function useUpdateBug() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:bugs:update", {
    mutationKey: ["projects", "bugs", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateBugInput & { projectId: number; id: number }) =>
      apiClient.patch<Bug>(`/build/${projectId}/bugs/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.bugs.list(vars.projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.bugs.detail(vars.projectId, vars.id) });
    },
  });
}

export function useDeleteBug() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:bugs:delete", {
    mutationKey: ["projects", "bugs", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<unknown>(`/build/${projectId}/bugs/${id}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.bugs.list(vars.projectId) });
    },
  });
}
