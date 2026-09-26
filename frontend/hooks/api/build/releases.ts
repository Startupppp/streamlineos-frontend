"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { Release, CreateReleaseInput, UpdateReleaseInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const projectReleaseListContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectReleaseListContract),
);
const projectReleaseRowContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectReleaseRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { queryKeyBase } from "@/lib/query-keys/base";
export type { Release } from "@/types/projects";

interface ReleaseListQuery {
  cursor?: string;
  limit?: number;
  status?: "draft" | "released" | "archived";
  q?: string;
}

function releaseKey(projectId: number, query?: ReleaseListQuery) {
  return [...queryKeyBase, "projects", projectId, "releases", query ?? {}] as const;
}

export function useReleases(projectId: number, query: ReleaseListQuery = {}) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: releaseKey(projectId, query),
    queryFn: ({ signal }) => apiClient.get(`/build/${projectId}/releases`, query, signal, projectReleaseListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateRelease(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "releases", "create"],
    mutationFn: (data: CreateReleaseInput) =>
      apiClient.post<Release>(`/build/${projectId}/releases`, data, undefined, projectReleaseRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeyBase, "projects", projectId, "releases"] }),
  });
}

export function useUpdateRelease(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "releases", "update"],
    mutationFn: ({ releaseId, ...data }: UpdateReleaseInput) =>
      apiClient.patch<Release>(`/build/${projectId}/releases/${releaseId}`, data, undefined, projectReleaseRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeyBase, "projects", projectId, "releases"] }),
  });
}

export function useDeleteRelease(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "releases", "delete"],
    mutationFn: (releaseId: number) =>
      apiClient.delete<void>(`/build/${projectId}/releases/${releaseId}`, undefined, undefined, noContentContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeyBase, "projects", projectId, "releases"] }),
  });
}
