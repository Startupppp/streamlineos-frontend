"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

/** Sentinel option value meaning "no filter"; never written to the URL. */
export const BUILD_FILTER_ALL = "all";
export const BUILD_SEARCH_DEBOUNCE_MS = 300;
export const BUILD_LIST_SEARCH_PARAM = "q";
const CURSOR_PARAM = "cursor";
const PAGE_PARAM = "page";

export interface BuildListFilterDefinition {
  param: string;
  /** Sentinel for "no filter". Defaults to `BUILD_FILTER_ALL`. */
  all?: string;
  /** Accepted values. A URL value outside the list is ignored. */
  options?: readonly string[];
}

export interface UseBuildListFiltersOptions {
  filters?: readonly BuildListFilterDefinition[];
  searchParam?: string;
  debounceMs?: number;
  /** Set false for a surface with no free-text search. */
  withSearch?: boolean;
}

export interface BuildListFiltersState {
  search: string;
  debouncedSearch: string;
  setSearch: (value: string) => void;
  value: (param: string) => string;
  isActive: (param: string) => boolean;
  setValue: (param: string, value: string) => void;
  clearAll: () => void;
  activeCount: number;
  isFiltered: boolean;
  /** Feed to `useCursorPager` so the cursor stack rewinds when the query changes. */
  resetKey: string;
  isPending: boolean;
}

/**
 * URL-backed filter state for a Build list page (FE-86/FE-87).
 *
 * Search is held locally so typing stays responsive, and only its debounced
 * value reaches the URL and the query. Choosing a sentinel deletes the param
 * rather than writing `all`, and any filter change drops the cursor and page
 * params, so a stale keyset window can never outlive the query that minted it.
 */
export function useBuildListFilters(
  options: UseBuildListFiltersOptions = {},
): BuildListFiltersState {
  const {
    filters = [],
    searchParam = BUILD_LIST_SEARCH_PARAM,
    debounceMs = BUILD_SEARCH_DEBOUNCE_MS,
    withSearch = true,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const writeParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      next.delete(CURSOR_PARAM);
      next.delete(PAGE_PARAM);
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const readValue = useCallback(
    (definition: BuildListFilterDefinition): string => {
      const sentinel = definition.all ?? BUILD_FILTER_ALL;
      const raw = searchParams.get(definition.param);
      if (!raw) return sentinel;
      if (definition.options && !definition.options.includes(raw)) return sentinel;
      return raw;
    },
    [searchParams],
  );

  const values = useMemo(() => {
    const map = new Map<string, { value: string; sentinel: string }>();
    for (const definition of filters) {
      map.set(definition.param, {
        value: readValue(definition),
        sentinel: definition.all ?? BUILD_FILTER_ALL,
      });
    }
    return map;
  }, [filters, readValue]);

  const urlSearch = withSearch ? (searchParams.get(searchParam) ?? "") : "";
  const [search, setSearchState] = useState(urlSearch);
  const [appliedUrlSearch, setAppliedUrlSearch] = useState(urlSearch);

  if (appliedUrlSearch !== urlSearch) {
    setAppliedUrlSearch(urlSearch);
    setSearchState(urlSearch);
  }

  const debouncedSearch = useDebouncedValue(search, debounceMs);
  const writtenSearch = useRef<string | null>(null);

  /**
   * `useRouter` may hand back a fresh object each render, which would re-run
   * this effect for ever against a URL that has not caught up yet. The guard
   * records what was written and releases the moment the URL agrees, so one
   * debounced value produces exactly one navigation.
   */
  useEffect(() => {
    if (!withSearch) return;
    if (debouncedSearch === urlSearch) {
      writtenSearch.current = null;
      return;
    }
    if (writtenSearch.current === debouncedSearch) return;
    writtenSearch.current = debouncedSearch;
    writeParams({ [searchParam]: debouncedSearch || null });
  }, [debouncedSearch, urlSearch, searchParam, withSearch, writeParams]);

  const setValue = useCallback(
    (param: string, value: string) => {
      const entry = values.get(param);
      const sentinel = entry?.sentinel ?? BUILD_FILTER_ALL;
      writeParams({ [param]: value === sentinel ? null : value });
    },
    [values, writeParams],
  );

  const clearAll = useCallback(() => {
    const updates: Record<string, string | null> = {};
    for (const definition of filters) updates[definition.param] = null;
    if (withSearch) updates[searchParam] = null;
    setSearchState("");
    writeParams(updates);
  }, [filters, searchParam, withSearch, writeParams]);

  const value = useCallback(
    (param: string) => values.get(param)?.value ?? BUILD_FILTER_ALL,
    [values],
  );

  const isActive = useCallback(
    (param: string) => {
      const entry = values.get(param);
      return entry !== undefined && entry.value !== entry.sentinel;
    },
    [values],
  );

  const activeCount = useMemo(() => {
    let count = 0;
    for (const entry of values.values()) {
      if (entry.value !== entry.sentinel) count += 1;
    }
    return count;
  }, [values]);

  const resetKey = useMemo(() => {
    const parts = filters.map((definition) => {
      const entry = values.get(definition.param);
      return `${definition.param}=${entry?.value ?? ""}`;
    });
    if (withSearch) parts.push(`${searchParam}=${debouncedSearch}`);
    return parts.join("&");
  }, [debouncedSearch, filters, searchParam, values, withSearch]);

  return {
    search,
    debouncedSearch,
    setSearch: setSearchState,
    value,
    isActive,
    setValue,
    clearAll,
    activeCount,
    isFiltered: activeCount > 0 || debouncedSearch.length > 0,
    resetKey,
    isPending,
  };
}
