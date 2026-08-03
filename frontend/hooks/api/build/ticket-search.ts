"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { TicketSearchResult } from "@/types/projects";
export type { TicketSearchResult } from "@/types/projects";
import { useCan } from "@/hooks/api/access";

export function useTicketSearch(
  q: string,
  options?: Omit<UseQueryOptions<TicketSearchResult[]>, "queryKey" | "queryFn">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<TicketSearchResult[]>({
    queryKey: queryKeys.projects.ticketSearch(q),
    queryFn: () =>
      apiClient.get<TicketSearchResult[]>("/build/search/tickets", { q, limit: 10 }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}
