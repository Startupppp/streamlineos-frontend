"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface TicketSearchResult {
  id: number;
  title: string;
  status: string;
  priority: string;
  ticketNumber: number;
  projectId: number;
  projectKey: string;
  projectName: string;
}

export function useTicketSearch(
  q: string,
  options?: Omit<UseQueryOptions<TicketSearchResult[]>, "queryKey" | "queryFn">
) {
  return useQuery<TicketSearchResult[]>({
    queryKey: [...queryKeys.projects.all, "search", "tickets", q],
    queryFn: () =>
      apiClient.get<TicketSearchResult[]>("/projects/search/tickets", { q, limit: 10 }),
    enabled: q.length > 0,
    staleTime: 30_000,
    ...options,
  });
}
