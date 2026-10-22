import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function projectFilesListQueryOptions(projectId: number, filters?: { q?: string }) {
  return {
    queryKey: buildWorkQueryKeys.projects.files.list(
      projectId,
      filters?.q ? filters : undefined,
    ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: { pagination: { nextCursor: string | null } }) =>
      last.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
  };
}
