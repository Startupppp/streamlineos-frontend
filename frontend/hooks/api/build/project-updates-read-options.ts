import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface ProjectUpdatesFilters {
  authorId?: string;
  from?: string;
  to?: string;
  status?: "draft" | "published";
  audience?: "internal" | "client";
}

export function projectUpdatesListQueryOptions(projectId: number, filters?: ProjectUpdatesFilters) {
  return {
    queryKey: buildWorkQueryKeys.projects.updates.list(
      projectId,
      filters && Object.keys(filters).length > 0 ? filters : undefined,
    ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: { pagination: { nextCursor: string | null } }) =>
      last.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
  };
}
