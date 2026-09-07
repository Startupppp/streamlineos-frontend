"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

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

const globalSearchC = lazyContract(() =>
  import("@/components/command-palette/hooks/global-search-schema").then((m) => m.globalSearchContract),
);

/**
 * `GET /search` is `x-exposure: universal` — every authenticated member may call
 * it and the subject comes from the token, so there is no permission to gate on.
 */
export function useGlobalSearch(query: string) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= GLOBAL_SEARCH_MIN_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: platformCoreQueryKeys.globalSearch.query(trimmed),
    queryFn: ({ signal }) =>
      apiClient.get<GlobalSearchResponse>("/search", { q: trimmed }, signal, globalSearchC),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  });

  return {
    results: enabled ? (data?.results ?? EMPTY_RESULTS) : EMPTY_RESULTS,
    isSearching: enabled && isFetching,
  };
}
