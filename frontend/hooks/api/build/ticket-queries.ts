"use client";

import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Ticket,
  TicketLabel,
  PaginatedResponse,
  TicketFilters,
} from "@/types/projects";
import { useProjectLabels } from "./projects";

const BOARD_PAGE_SIZE = 100;
const BOARD_AUTOLOAD_LIMIT = 500;

export function useTickets(
  projectId: number,
  filters?: TicketFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<Ticket>>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<PaginatedResponse<Ticket>>({
    queryKey: queryKeys.projects.tickets({ projectId, ...filters }),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Ticket>>(`/build/${projectId}/tickets`, filters ? { ...filters } : undefined),
    enabled: canView && !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useProjectBoardTickets(projectId: number) {
  const canView = useCan("build:tickets:view");
  const query = useInfiniteQuery<PaginatedResponse<Ticket>>({
    queryKey: queryKeys.projects.tickets({ projectId, view: "board" }),
    queryFn: ({ pageParam }) =>
      apiClient.get<PaginatedResponse<Ticket>>(`/build/${projectId}/tickets`, {
        limit: BOARD_PAGE_SIZE,
        page: pageParam as number,
        orderBy: "rank",
        orderDir: "asc",
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    enabled: canView && !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const data = useMemo(
    () => query.data?.pages.flatMap((p) => p.data ?? []) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (data.length >= BOARD_AUTOLOAD_LIMIT) return;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, data.length]);

  return {
    ...query,
    data,
    total,
    loadedCount: data.length,
    isTruncated: total > data.length,
  };
}

export function useTicket(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<Ticket | null>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<Ticket | null>({
    queryKey: queryKeys.projects.ticket(ticketId),
    queryFn: () =>
      apiClient.get<Ticket | null>(`/build/${projectId}/tickets/${ticketId}`),
    enabled: canView && !!ticketId && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useLabels(options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">) {
  return useProjectLabels(undefined, options);
}

export function useSubtasks(
  ticketId: number,
  projectId?: number,
  options?: Omit<UseQueryOptions<Ticket[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<Ticket[]>({
    queryKey: queryKeys.projects.subtasks(ticketId),
    queryFn: () => apiClient.get<Ticket[]>(`/build/${projectId ?? 0}/tickets/${ticketId}/subtasks`),
    enabled: canView && ticketId > 0 && (projectId ?? 0) > 0,
    staleTime: 30_000,
    ...options,
  });
}
