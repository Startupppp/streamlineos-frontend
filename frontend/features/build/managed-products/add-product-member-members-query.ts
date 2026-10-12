"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type { BuildMembersResponse } from "@/hooks/api/build/build-members";

const candidatesPageContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.buildMemberPageContract),
);

const INITIAL_CURSOR: string = "";

interface MemberCandidatesParams {
  search?: string;
  enabled?: boolean;
}

export function useAddProductMemberCandidates({
  search,
  enabled = true,
}: MemberCandidatesParams) {
  const canView = useCan("build:members:view");
  return useInfiniteQuery({
    queryKey: [
      ...buildWorkQueryKeys.projects.buildMembers.list({ search }),
      "dialog-candidates",
    ],
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<BuildMembersResponse>(
        "/build/members",
        {
          ...(pageParam ? { cursor: pageParam } : {}),
          ...(search ? { search } : {}),
        },
        signal,
        candidatesPageContract,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore && lastPage.pagination.nextCursor
        ? lastPage.pagination.nextCursor
        : undefined,
    initialPageParam: INITIAL_CURSOR,
    staleTime: 30_000,
    enabled: canView && enabled,
  });
}
