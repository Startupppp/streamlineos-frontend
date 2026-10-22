import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ProjectFilters } from "@/types/projects";

export function projectsListQueryOptions(filters?: ProjectFilters) {
  return {
    queryKey: buildWorkQueryKeys.projects.list(
      filters ? { ...filters } : undefined,
    ),
    staleTime: 30_000,
  };
}

export function projectDetailQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.detail(projectId),
    staleTime: 30_000,
  };
}
