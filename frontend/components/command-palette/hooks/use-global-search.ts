"use client";

import { useCallback, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { lazyContract } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { globalSearchContract } from "@/components/command-palette/hooks/global-search-schema";

type GlobalSearchResponse = z.infer<typeof globalSearchContract>;

export type GlobalSearchResult = GlobalSearchResponse["results"][number];

export type GlobalSearchType = GlobalSearchResult["type"];

type LegacySearchType = "lead" | "deal" | "contact" | "client" | "ticket";

const LEGACY_SEARCH_TYPES: readonly LegacySearchType[] = ["lead", "deal", "contact", "client", "ticket"];

export const GLOBAL_SEARCH_MIN_LENGTH = 2;

const EMPTY_RESULTS: readonly never[] = [];

const globalSearchC = lazyContract(() =>
  import("@/components/command-palette/hooks/global-search-schema").then((m) => m.globalSearchContract),
);

/**
 * `GET /search` is `x-exposure: universal` — every authenticated member may call
 * it and the subject comes from the token, so there is no permission to gate on.
 */
export function useGlobalSearch<T extends GlobalSearchType = LegacySearchType>(
  query: string,
  types?: readonly T[],
) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= GLOBAL_SEARCH_MIN_LENGTH;
  const typesParam = types?.join(",");

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: platformCoreQueryKeys.globalSearch.query(trimmed, typesParam),
    queryFn: ({ signal }) =>
      apiClient.get<GlobalSearchResponse>(
        "/search",
        typesParam ? { q: trimmed, types: typesParam } : { q: trimmed },
        signal,
        globalSearchC,
      ),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  });

  const results = useMemo(() => {
    const requested = new Set<string>(types ?? LEGACY_SEARCH_TYPES);
    const source: readonly GlobalSearchResult[] = data?.results ?? EMPTY_RESULTS;
    return source.filter(
      (result): result is GlobalSearchResult & { type: T } => requested.has(result.type),
    );
  }, [data, types]);

  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const visible: readonly (GlobalSearchResult & { type: T })[] = enabled ? results : EMPTY_RESULTS;

  return {
    results: visible,
    isSearching: enabled && isFetching,
    isError: enabled && isError,
    error: enabled ? error : null,
    retry,
  };
}
