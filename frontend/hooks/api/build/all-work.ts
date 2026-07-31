"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AllWorkFilters, AllWorkTicket, PaginatedResponse } from "@/types/projects";
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
  options?: Omit<UseQueryOptions<PaginatedResponse<AllWorkTicket>>, "queryKey" | "queryFn">
) {
  const canView = useCan("build:tickets:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<PaginatedResponse<AllWorkTicket>>({
    queryKey: queryKeys.projects.allWork(filters ? { ...filters } : undefined),
    queryFn: () =>
      apiClient.get<PaginatedResponse<AllWorkTicket>>("/build/all-work", filters ? { ...filters } : undefined),
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
      PaginatedResponse<AllWorkTicket>,
      Error,
      InfiniteData<PaginatedResponse<AllWorkTicket>>,
      readonly unknown[],
      number
    >,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >
) {
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.projects.allWork({ ...filters }),
      "infinite",
    ] as const,
    queryFn: ({ pageParam }) =>
      apiClient.get<PaginatedResponse<AllWorkTicket>>("/build/all-work", {
        ...filters,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
    ...restOptions,
    enabled: enabledOption ?? true,
  });
}
