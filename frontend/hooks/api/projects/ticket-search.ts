"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { TicketSearchResult } from "@/types/projects";
export type { TicketSearchResult } from "@/types/projects";

export function useTicketSearch(
  q: string,
  options?: Omit<UseQueryOptions<TicketSearchResult[]>, "queryKey" | "queryFn">
) {
  return useQuery<TicketSearchResult[]>({
    queryKey: [...queryKeys.projects.all, "search", "tickets", q],
    queryFn: () =>
      apiClient.get<TicketSearchResult[]>("/projects/search/tickets", { q, limit: 10 }),
    staleTime: 30_000,
    ...options,
  });
}
