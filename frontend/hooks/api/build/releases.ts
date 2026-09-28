"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useCan, useCanState } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { Release, CreateReleaseInput, UpdateReleaseInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

type ReleasePage = {
  data: Release[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

const projectReleaseListContract = lazyContract<ReleasePage>(() =>
  import("@/hooks/api/build/build-project-schema").then((m) =>
    m.projectReleaseListContract
      .or(z.array(m.projectReleaseRowContract))
      .transform((value) =>
        Array.isArray(value)
          ? {
              data: value,
              pagination: { limit: value.length, hasMore: false, nextCursor: null },
            }
          : value,
      ),
  ),
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
  from?: string;
  to?: string;
}

export function releaseBaseKey(projectId: number) {
  return [...queryKeyBase, "projects", projectId, "releases"] as const;
}

function releaseKey(projectId: number, query?: ReleaseListQuery) {
  return [...releaseBaseKey(projectId), query ?? {}] as const;
}

interface OrgReleaseFilters {
  status?: "draft" | "released" | "archived";
  cursor?: string;
}

export function useOrgReleases(filters?: OrgReleaseFilters) {
  const canState = useCanState("build:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.cursor) params["cursor"] = filters.cursor;

  return useQuery({
    queryKey: buildWorkQueryKeys.projects.orgReleases(Object.keys(params).length > 0 ? params : undefined),
    queryFn: ({ signal }) => apiClient.get("/build/releases", Object.keys(params).length > 0 ? params : undefined, signal, projectReleaseListContract),
    enabled: canState !== "denied",
    staleTime: 60_000,
    throwOnError: false,
  });
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
      apiClient.post(`/build/${projectId}/releases`, data, undefined, projectReleaseRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: releaseBaseKey(projectId) }),
  });
}

export function useUpdateRelease(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "releases", "update"],
    mutationFn: ({ releaseId, ...data }: UpdateReleaseInput) =>
      apiClient.patch(`/build/${projectId}/releases/${releaseId}`, data, undefined, projectReleaseRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: releaseBaseKey(projectId) }),
  });
}

export function useDeleteRelease(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "releases", "delete"],
    mutationFn: (releaseId: number) =>
      apiClient.delete<void>(`/build/${projectId}/releases/${releaseId}`, undefined, undefined, noContentContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: releaseBaseKey(projectId) }),
  });
}
