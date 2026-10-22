import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function meetingsListQueryOptions(projectId: number, params?: Record<string, string>) {
  const hasParams = params && Object.keys(params).length > 0;
  return {
    queryKey: buildWorkQueryKeys.projects.meetings.list(projectId, hasParams ? params : undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: { pagination: { nextCursor: string | null } }) =>
      last.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
  };
}

export function meetingDetailQueryOptions(projectId: number, meetingId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.meetings.detail(projectId, meetingId),
    staleTime: 60_000,
  } as const;
}
