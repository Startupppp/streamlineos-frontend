"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface GlobalSearchResult {
  id: number;
  type: "lead" | "deal" | "contact" | "client" | "ticket";
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

interface GlobalSearchResponse {
  results: GlobalSearchResult[];
}

export const GLOBAL_SEARCH_MIN_LENGTH = 2;

const EMPTY_RESULTS: readonly GlobalSearchResult[] = [];

/**
 * `GET /search` is `x-exposure: universal` — every authenticated member may call
 * it and the subject comes from the token, so there is no permission to gate on.
 */
export function useGlobalSearch(query: string) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= GLOBAL_SEARCH_MIN_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.globalSearch.query(trimmed),
    queryFn: ({ signal }) =>
      apiClient.get<GlobalSearchResponse>("/search", { q: trimmed }, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  });

  return {
    results: enabled ? (data?.results ?? EMPTY_RESULTS) : EMPTY_RESULTS,
    isSearching: enabled && isFetching,
  };
}
