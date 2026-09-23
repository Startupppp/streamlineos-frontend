"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type { Bug, CreateBugInput, UpdateBugInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const bugListContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.bugListContract),
);
const bugRowContract = lazyContract(() =>
  import("@/hooks/api/build/qa-schema").then((m) => m.bugRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

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
    queryKey: buildWorkQueryKeys.projects.bugs.list(projectId ?? 0, filters),
    queryFn: ({ signal }) => apiClient.get<Bug[]>(`/build/${projectId}/bugs`, params, signal, bugListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useBug(
  projectId?: number,
  bugId?: number,
  options?: { enabled?: boolean },
) {
  const canView = useCan("build:bugs:view");

  return useQuery<Bug>({
    queryKey: buildWorkQueryKeys.projects.bugs.detail(
      projectId ?? 0,
      bugId ?? 0,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<Bug>(
        `/build/${projectId}/bugs/${bugId}`,
        undefined,
        signal,
        bugRowContract,
      ),
    enabled: canView && !!projectId && !!bugId && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useCreateBug() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:bugs:create", {
    mutationKey: ["projects", "bugs", "create"],
    mutationFn: ({ projectId, ...data }: CreateBugInput & { projectId: number }) =>
      apiClient.post<Bug>(`/build/${projectId}/bugs`, data, undefined, bugRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.bugs.list(vars.projectId) });
    },
  });
}

export function useUpdateBug() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:bugs:update", {
    mutationKey: ["projects", "bugs", "update"],
    mutationFn: ({
      projectId,
      bugId,
      ...data
    }: UpdateBugInput & { projectId: number; bugId: number }) =>
      apiClient.patch<Bug>(`/build/${projectId}/bugs/${bugId}`, data, undefined, bugRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.bugs.list(vars.projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.bugs.detail(vars.projectId, vars.bugId) });
    },
  });
}

export function useDeleteBug() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:bugs:delete", {
    mutationKey: ["projects", "bugs", "delete"],
    mutationFn: ({ projectId, bugId }: { projectId: number; bugId: number }) =>
      apiClient.delete<void>(`/build/${projectId}/bugs/${bugId}`, undefined, undefined, noContentContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.bugs.list(vars.projectId) });
    },
  });
}
