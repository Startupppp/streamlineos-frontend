"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { TicketSearchResult } from "@/types/projects";
export type { TicketSearchResult } from "@/types/projects";
import { useCan } from "@/hooks/api/access";

const ticketSearchResultListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.ticketSearchResultListContract),
);

export function useTicketSearch(
  q: string,
  options?: Omit<UseQueryOptions<TicketSearchResult[]>, "queryKey" | "queryFn">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<TicketSearchResult[]>({
    queryKey: buildWorkQueryKeys.projects.ticketSearch(q),
    queryFn: ({ signal }) =>
      apiClient.get<TicketSearchResult[]>(
        "/build/search/tickets",
        { q, limit: 10 },
        signal,
        ticketSearchResultListLazy,
      ),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}
