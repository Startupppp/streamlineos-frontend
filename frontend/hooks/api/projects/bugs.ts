"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Bug, CreateBugInput, UpdateBugInput } from "@/types/projects";

type BugFilters = {
  status?: string;
  severity?: string;
  assigneeId?: string;
  q?: string;
};

export function useBugs(projectId?: number, filters?: BugFilters) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.severity) params["severity"] = filters.severity;
  if (filters?.assigneeId) params["assigneeId"] = filters.assigneeId;
  if (filters?.q) params["q"] = filters.q;

  return useQuery<Bug[]>({
    queryKey: queryKeys.projects.bugs.list(projectId, filters),
    queryFn: () => apiClient.get<Bug[]>(`/projects/${projectId}/bugs`, params),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useBug(projectId?: number, bugId?: number) {
  return useQuery<Bug>({
    queryKey: queryKeys.projects.bugs.detail(projectId, bugId),
    queryFn: () => apiClient.get<Bug>(`/projects/${projectId}/bugs/${bugId}`),
    enabled: !!projectId && !!bugId,
    staleTime: 60_000,
  });
}

export function useCreateBug() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "bugs", "create"],
    mutationFn: ({ projectId, ...data }: CreateBugInput & { projectId: number }) =>
      apiClient.post<Bug>(`/projects/${projectId}/bugs`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.bugs.list(vars.projectId) });
    },
  });
}

export function useUpdateBug() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "bugs", "update"],
    mutationFn: ({
      projectId,
      id,
      ...data
    }: UpdateBugInput & { projectId: number; id: number }) =>
      apiClient.patch<Bug>(`/projects/${projectId}/bugs/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.bugs.list(vars.projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.bugs.detail(vars.projectId, vars.id) });
    },
  });
}

export function useDeleteBug() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "bugs", "delete"],
    mutationFn: ({ projectId, id }: { projectId: number; id: number }) =>
      apiClient.delete<unknown>(`/projects/${projectId}/bugs/${id}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.bugs.list(vars.projectId) });
    },
  });
}
