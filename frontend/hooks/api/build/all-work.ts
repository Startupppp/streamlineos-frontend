"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AllWorkFilters, AllWorkTicket, CursorPaginatedResponse } from "@/types/projects";
import { useCan } from "@/hooks/api/access";

export const COMMAND_CENTER_MY_ISSUES_PAGE_SIZE = 15;

export const COMMAND_CENTER_MY_ISSUES_FILTERS: AllWorkFilters = {
  scope: "mine",
  limit: COMMAND_CENTER_MY_ISSUES_PAGE_SIZE,
  orderBy: "dueDate",
  orderDir: "asc",
  excludeStatus: "DONE,CANCELLED",
};

export function useAllWork(
  filters?: AllWorkFilters,
  options?: Omit<UseQueryOptions<CursorPaginatedResponse<AllWorkTicket>>, "queryKey" | "queryFn">
) {
  const canView = useCan("build:tickets:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<CursorPaginatedResponse<AllWorkTicket>>({
    queryKey: queryKeys.projects.allWork(filters ? { ...filters } : undefined),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPaginatedResponse<AllWorkTicket>>("/build/all-work", filters ? { ...filters } : undefined, signal),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
}

export function useInfiniteAllWork(
  filters: AllWorkFilters,
  options?: Omit<
    UseInfiniteQueryOptions<
      CursorPaginatedResponse<AllWorkTicket>,
      Error,
      InfiniteData<CursorPaginatedResponse<AllWorkTicket>>,
      readonly unknown[],
      string | undefined
    >,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >
) {
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useInfiniteQuery({
    queryKey: queryKeys.projects.allWorkInfinite({ ...filters }),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<CursorPaginatedResponse<AllWorkTicket>>("/build/all-work", {
        ...filters,
        ...(pageParam ? { cursor: pageParam } : {}),
      }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    ...restOptions,
    enabled: enabledOption ?? true,
  });
}
