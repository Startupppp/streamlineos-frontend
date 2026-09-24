"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const ticketListPageLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-core-schema").then((m) => m.ticketListPageContract),
);
const ticketDetailLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-core-schema").then((m) => m.ticketDetailContract),
);
const columnCountsLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.columnCountsContract),
);
const subtaskListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.subtaskListContract),
);
import type {
  Ticket,
  CursorPageResponse,
  TicketFilters,
} from "@/types/projects";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export const BOARD_PAGE_SIZE = 100;

export function useTickets(
  projectId: number,
  filters?: TicketFilters,
  options?: Omit<UseQueryOptions<CursorPageResponse<Ticket>>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<CursorPageResponse<Ticket>>({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId, ...filters }),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPageResponse<Ticket>>(`/build/${projectId}/tickets`, filters ? { ...filters } : undefined, signal, ticketListPageLazy),
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
  module?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
};

export function useProjectBoardTickets(projectId: number, filters?: BoardFilters) {
  const canView = useCan("build:tickets:view");
  const query = useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId, view: "board", ...filters }),
    queryFn: ({ pageParam , signal }) => {
      const params: Record<string, unknown> = {
        limit: BOARD_PAGE_SIZE,
        orderBy: "rank",
        orderDir: "asc",
        ...(pageParam !== undefined ? { cursor: pageParam } : {}),
      };
      if (filters?.q) params.search = filters.q;
      if (filters?.status) params.status = filters.status;
      if (filters?.priority) params.priority = filters.priority;
      if (filters?.type) params.type = filters.type;
      if (filters?.assigneeId) params.assigneeId = filters.assigneeId;
      if (filters?.labels) params.labelIds = filters.labels;
      if (filters?.cycle) params.cycleId = filters.cycle;
      if (filters?.module) params.moduleIds = filters.module;
      if (filters?.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
      if (filters?.dueDateTo) params.dueDateTo = filters.dueDateTo;
      return apiClient.get<CursorPageResponse<Ticket>>(`/build/${projectId}/tickets`, params, signal, ticketListPageLazy);
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled: canView && !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const data = useMemo(
    () => query.data?.pages.flatMap((p) => p.data ?? []) ?? [],
    [query.data],
  );
  return {
    ...query,
    data,
    total: data.length,
    loadedCount: data.length,
    isTruncated: query.hasNextPage,
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
      apiClient.get<Ticket | null>(`/build/${projectId}/tickets/${ticketId}`, undefined, signal, ticketDetailLazy),
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
        `/build/${projectId}/tickets/key/${ticketNumber}`, undefined, signal, ticketDetailLazy,
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

export function useSubtasks(
  ticketId: number,
  projectId?: number,
  options?: Omit<UseQueryOptions<Ticket[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<Ticket[]>({
    queryKey: buildWorkQueryKeys.projects.subtasks(ticketId, projectId),
    queryFn: ({ signal }) =>
      apiClient.get<Ticket[]>(
        `/build/${projectId ?? 0}/tickets/${ticketId}/subtasks`,
        undefined,
        signal,
        subtaskListLazy,
      ),
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
      apiClient.get<Record<string, number>>(`/build/${projectId}/tickets/column-counts`, undefined, signal, columnCountsLazy),
    enabled: canView && projectId > 0,
    staleTime: 30_000,
  });
}
