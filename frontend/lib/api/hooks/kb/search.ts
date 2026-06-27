"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { KbSearchParams, KbSearchResponse } from "@/types/kb";

export function useKbSearch(params: KbSearchParams, options?: { enabled?: boolean }) {
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: queryKeys.kb.search(queryParams),
    queryFn: () => apiClient.get<KbSearchResponse>("/kb/search", queryParams),
    staleTime: 0,
    enabled: (options?.enabled ?? true) && params.q.trim().length > 0,
  });
}
