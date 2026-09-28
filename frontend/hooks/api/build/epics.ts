"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { Epic } from "@/types/projects";

const epicPageContract = lazyContract(() =>
  import("@/hooks/api/build/execution-schema").then((m) => m.epicPageContract),
);

export interface EpicListFilters {
  q?: string;
  status?: string;
  ownerId?: string;
  health?: "on_track" | "at_risk" | "off_track";
  cursor?: string;
  limit?: number;
}

export type EpicPage = {
  data: Epic[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

function epicPageQuery(projectId: number, filters?: EpicListFilters) {
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters ?? {}))
    if (value !== undefined && value !== "") queryParams[key] = String(value);
  return {
    queryKey: [...buildWorkQueryKeys.projects.epics(projectId), filters ?? {}],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      apiClient.get<EpicPage>(
        `/build/${projectId}/epics`,
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
        signal,
        epicPageContract,
      ),
    staleTime: 30_000,
  };
}

export function useEpicPage(
  projectId: number,
  filters?: EpicListFilters,
  options?: Omit<UseQueryOptions<EpicPage>, "queryKey" | "queryFn" | "enabled">,
) {
  const canView = useCan("build:tickets:view");
  return useQuery<EpicPage>({
    ...epicPageQuery(projectId, filters),
    ...options,
    enabled: canView && !!projectId,
  });
}

export function useEpics(
  projectId: number,
  options?: Omit<
    UseQueryOptions<EpicPage, Error, Epic[]>,
    "queryKey" | "queryFn" | "enabled" | "select"
  >,
) {
  const canView = useCan("build:tickets:view");
  return useQuery<EpicPage, Error, Epic[]>({
    ...epicPageQuery(projectId),
    select: (page) => page.data,
    ...options,
    enabled: canView && !!projectId,
  });
}
