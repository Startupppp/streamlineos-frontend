"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const updatePageContract = lazyContract(() =>
  import("@/hooks/api/build/project-updates-schema").then(
    (m) => m.updatePageContract,
  ),
);
const updateRowContract = lazyContract(() =>
  import("@/hooks/api/build/project-updates-schema").then(
    (m) => m.updateRowContract,
  ),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface ProjectUpdateRow {
  id: number;
  orgId: string;
  projectId: number;
  authorMembershipId: number;
  body: string;
  status: "draft" | "published";
  audience: "internal" | "client";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectUpdatePage {
  data: ProjectUpdateRow[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface CreateProjectUpdateInput {
  body: string;
}

export interface ProjectUpdatesFilters {
  authorId?: string;
  from?: string;
  to?: string;
  status?: "draft" | "published";
}

export function useProjectUpdates(
  projectId: number,
  filters?: ProjectUpdatesFilters,
) {
  const canView = useCan("build:updates:view");

  const activeFilters: ProjectUpdatesFilters = {};
  if (filters?.authorId) activeFilters.authorId = filters.authorId;
  if (filters?.from) activeFilters.from = filters.from;
  if (filters?.to) activeFilters.to = filters.to;
  if (filters?.status) activeFilters.status = filters.status;

  const query = useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.updates.list(
      projectId,
      Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
    ),
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<ProjectUpdatePage>(
        `/build/${projectId}/updates`,
        {
          ...(pageParam !== undefined ? { cursor: pageParam } : {}),
          ...(activeFilters.authorId ? { authorId: activeFilters.authorId } : {}),
          ...(activeFilters.from ? { from: activeFilters.from } : {}),
          ...(activeFilters.to ? { to: activeFilters.to } : {}),
          ...(activeFilters.status ? { status: activeFilters.status } : {}),
        },
        signal,
        updatePageContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (page) => page.pagination.nextCursor ?? undefined,
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
  const data = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );
  return { ...query, data };
}

export function useCreateProjectUpdate(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:updates:manage", {
    mutationKey: ["projects", projectId, "updates", "create"],
    mutationFn: (input: CreateProjectUpdateInput) =>
      apiClient.post<ProjectUpdateRow>(
        `/build/${projectId}/updates`,
        input,
        undefined,
        updateRowContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.updates.list(projectId),
      });
    },
  });
}

export function useDeleteProjectUpdate(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:updates:manage", {
    mutationKey: ["projects", projectId, "updates", "delete"],
    mutationFn: (updateId: number) =>
      apiClient.delete<void>(
        `/build/${projectId}/updates/${updateId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.updates.list(projectId),
      });
    },
  });
}
