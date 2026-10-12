"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useCan } from "@/hooks/api/access";
import type { GoalListItem } from "@/hooks/api/goals";

const goalsPageContract = lazyContract(() =>
  import("@/hooks/api/goals-schema").then((m) => m.goalsListContract),
);

const INITIAL_PAGE: number = 1;

interface GoalCandidatesParams {
  search?: string;
  enabled?: boolean;
}

interface GoalsPage {
  items: GoalListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export function useLinkGoalCandidates({ search, enabled = true }: GoalCandidatesParams) {
  const canView = useCan("build:goals:view");
  return useInfiniteQuery({
    queryKey: [
      ...accountingAndSupportQueryKeys.goals.list({ search }),
      "dialog-candidates",
    ],
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<GoalsPage>(
        "/goals",
        {
          ...(search ? { search } : {}),
          page: pageParam,
        },
        signal,
        goalsPageContract,
      ),
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: INITIAL_PAGE,
    staleTime: 30_000,
    enabled: canView && enabled,
  });
}
