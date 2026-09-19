"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const allWorkPageContract = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.allWorkPageContract),
);
import type { AllWorkFilters, AllWorkTicket, CursorPaginatedResponse } from "@/types/projects";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

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
    queryKey: buildWorkQueryKeys.projects.allWork(filters ? { ...filters } : undefined),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPaginatedResponse<AllWorkTicket>>("/build/all-work", filters ? { ...filters } : undefined, signal, allWorkPageContract),
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
  const canView = useCan("build:tickets:view");
  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.allWorkInfinite({ ...filters }),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<CursorPaginatedResponse<AllWorkTicket>>("/build/all-work", {
        ...filters,
        ...(pageParam !== undefined ? { cursor: pageParam } : {}),
      }, signal, allWorkPageContract),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
}
