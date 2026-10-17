"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ProjectAnalytics } from "@/types/projects";

const analyticsContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.analyticsContract),
);

export interface ProjectAnalyticsParams {
  range?: "7d" | "30d" | "90d";
  teamId?: number;
  ownerId?: string;
}

export function useProjectAnalytics(
  projectId: number,
  params?: ProjectAnalyticsParams,
  options?: Omit<UseQueryOptions<ProjectAnalytics>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:view");
  return useQuery<ProjectAnalytics>({
    queryKey: buildWorkQueryKeys.projects.analytics(projectId, params),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectAnalytics>(`/build/${projectId}/analytics`, params, signal, analyticsContract),
    enabled: canView && !!projectId,
    staleTime: 5 * 60_000,
    ...options,
  });
}
