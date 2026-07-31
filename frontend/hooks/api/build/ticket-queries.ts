"use client";

import { useQuery } from "@tanstack/react-query";
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
const BOARD_MAX_PAGES = 5;

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

export function useProjectBoardTickets(
  projectId: number,
  options?: Omit<UseQueryOptions<Ticket[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<Ticket[]>({
    queryKey: queryKeys.projects.tickets({ projectId, view: "board" }),
    queryFn: async () => {
      const first = await apiClient.get<PaginatedResponse<Ticket>>(
        `/build/${projectId}/tickets`,
        { limit: BOARD_PAGE_SIZE, page: 1, orderBy: "order", orderDir: "asc" },
      );
      const pages = Math.min(first.totalPages ?? 1, BOARD_MAX_PAGES);
      if (pages <= 1) return first.data ?? [];
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
          apiClient.get<PaginatedResponse<Ticket>>(`/build/${projectId}/tickets`, {
            limit: BOARD_PAGE_SIZE,
            page: i + 2,
            orderBy: "order",
            orderDir: "asc",
          }),
        ),
      );
      return [...(first.data ?? []), ...rest.flatMap((p) => p.data ?? [])];
    },
    enabled: canView && !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    ...options,
  });
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
