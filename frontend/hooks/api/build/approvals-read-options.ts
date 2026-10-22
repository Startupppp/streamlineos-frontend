import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function projectApprovalsListQueryOptions(projectId: number, params?: Record<string, string>) {
  return {
    queryKey: buildWorkQueryKeys.projects.approvals.list(
      projectId,
      params && Object.keys(params).length > 0 ? params : undefined,
    ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: { pagination: { nextCursor: string | null } }) =>
      last.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
  };
}
