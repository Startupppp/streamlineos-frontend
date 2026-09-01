"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { KbSearchParams, KbSearchResponse } from "@/types/kb";

export function useKbSearch(params: KbSearchParams, options?: { enabled?: boolean }) {
  const canViewArticles = useCan("kb:articles:view");
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: queryKeys.kb.search(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbSearchResponse>("/kb/search", queryParams, signal),
    staleTime: 0,
    enabled: canViewArticles && (options?.enabled ?? true) && params.q.trim().length > 0,
  });
}
