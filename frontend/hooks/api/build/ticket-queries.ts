"use client";

import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  Ticket,
  TicketLabel,
  CursorPageResponse,
  TicketFilters,
} from "@/types/projects";
import { useProjectLabels } from "./projects";

const BOARD_PAGE_SIZE = 100;
const BOARD_AUTOLOAD_LIMIT = 500;

export function useTickets(
  projectId: number,
  filters?: TicketFilters,
  options?: Omit<UseQueryOptions<CursorPageResponse<Ticket>>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<CursorPageResponse<Ticket>>({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId, ...filters }),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPageResponse<Ticket>>(`/build/${projectId}/tickets`, filters ? { ...filters } : undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    ...options,
  });
}

export type BoardFilters = {
  q?: string;
  status?: string;
  priority?: string;
  type?: string;
  assigneeId?: string;
  labels?: string;
  cycle?: string;
  sprint?: string;
  module?: string;
};

export function useProjectBoardTickets(projectId: number, filters?: BoardFilters) {
  const canView = useCan("build:tickets:view");
  const hasFilters = !!(
    filters?.q ||
    filters?.status ||
    filters?.priority ||
    filters?.type ||
    filters?.assigneeId ||
    filters?.labels ||
    filters?.cycle ||
    filters?.sprint ||
    filters?.module
  );

  const query = useInfiniteQuery<CursorPageResponse<Ticket>>({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId, view: "board", ...filters }),
    queryFn: ({ pageParam , signal }) => {
      const params: Record<string, unknown> = {
        limit: BOARD_PAGE_SIZE,
        orderBy: "rank",
        orderDir: "asc",
        ...(pageParam !== undefined ? { cursor: pageParam as string } : {}),
      };
      if (filters?.q) params.search = filters.q;
      if (filters?.status) params.status = filters.status;
      if (filters?.priority) params.priority = filters.priority;
      if (filters?.type) params.type = filters.type;
      if (filters?.assigneeId) params.assigneeId = filters.assigneeId;
      if (filters?.labels) params.labelIds = filters.labels;
      if (filters?.cycle) params.cycleId = filters.cycle;
      if (filters?.sprint) params.sprintIds = filters.sprint;
      if (filters?.module) params.moduleIds = filters.module;
      return apiClient.get<CursorPageResponse<Ticket>>(`/build/${projectId}/tickets`, params, signal);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled: canView && !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const data = useMemo(
    () => query.data?.pages.flatMap((p) => p.data ?? []) ?? [],
    [query.data],
  );
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    if (hasFilters) return;
    if (!hasNextPage || isFetchingNextPage) return;
    if (data.length >= BOARD_AUTOLOAD_LIMIT) return;
    void fetchNextPage();
  }, [hasFilters, hasNextPage, isFetchingNextPage, fetchNextPage, data.length]);

  return {
    ...query,
    data,
    total: data.length,
    loadedCount: data.length,
    isTruncated: hasNextPage,
  };
}

export function useTicket(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<Ticket | null>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<Ticket | null>({
    queryKey: buildWorkQueryKeys.projects.ticket(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<Ticket | null>(`/build/${projectId}/tickets/${ticketId}`, undefined, signal),
    enabled: canView && !!ticketId && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useTicketByKey(
  projectId: number,
  ticketNumber: number | null,
  options?: Omit<UseQueryOptions<Ticket | null>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  const queryClient = useQueryClient();
  return useQuery<Ticket | null>({
    queryKey: buildWorkQueryKeys.projects.ticketByKey(projectId, ticketNumber ?? 0),
    queryFn: async ({ signal }) => {
      const ticket = await apiClient.get<Ticket | null>(
        `/build/${projectId}/tickets/key/${ticketNumber}`, undefined, signal,
      );
      if (ticket) {
        queryClient.setQueryData(buildWorkQueryKeys.projects.ticket(ticket.id), ticket);
      }
      return ticket;
    },
    enabled: canView && !!ticketNumber && !!projectId,
    staleTime: 60_000,
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
    queryKey: buildWorkQueryKeys.projects.subtasks(ticketId),
    queryFn: ({ signal }) => apiClient.get<Ticket[]>(`/build/${projectId ?? 0}/tickets/${ticketId}/subtasks`, undefined, signal),
    enabled: canView && ticketId > 0 && (projectId ?? 0) > 0,
    staleTime: 30_000,
    ...options,
  });
}

export function useTicketColumnCounts(projectId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery<Record<string, number>>({
    queryKey: buildWorkQueryKeys.projects.columnCounts(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<Record<string, number>>(`/build/${projectId}/tickets/column-counts`, undefined, signal),
    enabled: canView && projectId > 0,
    staleTime: 30_000,
  });
}
