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
import {
  BUILD_LIST_CURSOR_PARAM,
  buildListSearchParams,
} from "./use-build-list-url-state";

export const BUILD_FILTER_ALL = "all";
export const BUILD_SEARCH_DEBOUNCE_MS = 300;
export const BUILD_LIST_SEARCH_PARAM = "q";
const PAGE_PARAM = "page";

export interface BuildListFilterDefinition {
  param: string;
  all?: string;
  options?: readonly string[];
}

export interface UseBuildListFiltersOptions {
  filters?: readonly BuildListFilterDefinition[];
  searchParam?: string;
  debounceMs?: number;
  withSearch?: boolean;
}

export interface BuildListFiltersStateBase {
  cursor: string | null;
  setCursor: (cursor: string | null) => void;
  value: (param: string) => string;
  isActive: (param: string) => boolean;
  setValue: (param: string, value: string) => void;
  setValues: (values: Readonly<Record<string, string>>) => void;
  clearAll: () => void;
  activeCount: number;
  isFiltered: boolean;
  resetKey: string;
  isPending: boolean;
}

export interface BuildListFiltersState extends BuildListFiltersStateBase {
  search: string;
  debouncedSearch: string;
  setSearch: (value: string) => void;
}

export function useBuildListFilters(options: UseBuildListFiltersOptions & { withSearch: false }): BuildListFiltersStateBase;
export function useBuildListFilters(options?: UseBuildListFiltersOptions): BuildListFiltersState;
export function useBuildListFilters(
  options: UseBuildListFiltersOptions = {},
): BuildListFiltersStateBase | BuildListFiltersState {
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
      const next = buildListSearchParams(searchParams, updates, {
        resetCursor: true,
      });
      next.delete(BUILD_LIST_CURSOR_PARAM);
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
  const cursor = searchParams.get(BUILD_LIST_CURSOR_PARAM);
  const [search, setSearchState] = useState(urlSearch);
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const appliedUrlSearch = useRef(urlSearch);
  const pendingSearchWrites = useRef(new Set<string>());
  const debouncedInput = useDebouncedValue(search, debounceMs);
  const debouncedSearch = isEditingSearch ? debouncedInput : urlSearch;
  const writtenSearch = useRef<string | null>(null);

  useEffect(() => {
    if (!withSearch) return;
    if (appliedUrlSearch.current !== urlSearch) {
      appliedUrlSearch.current = urlSearch;
      if (!pendingSearchWrites.current.delete(urlSearch)) {
        pendingSearchWrites.current.clear();
        writtenSearch.current = null;
        function applyHistorySearch() {
          setSearchState(urlSearch);
          setIsEditingSearch(false);
        }
        startTransition(applyHistorySearch);
        return;
      }
      if (!isEditingSearch) pendingSearchWrites.current.clear();
    }
    if (!isEditingSearch || debouncedInput !== search) return;
    if (debouncedInput === urlSearch) {
      pendingSearchWrites.current.clear();
      writtenSearch.current = null;
      function finishSearchWrite() { setIsEditingSearch(false); }
      startTransition(finishSearchWrite);
      return;
    }
    if (writtenSearch.current === debouncedInput) return;
    writtenSearch.current = debouncedInput;
    pendingSearchWrites.current.add(debouncedInput);
    writeParams({ [searchParam]: debouncedInput || null });
  }, [debouncedInput, search, isEditingSearch, urlSearch, searchParam, withSearch, writeParams]);

  const setSearch = useCallback((value: string) => {
    setIsEditingSearch(true);
    setSearchState(value);
  }, []);

  const setValues = useCallback(
    (updates: Readonly<Record<string, string>>) => {
      const normalized: Record<string, string | null> = {};
      for (const [param, value] of Object.entries(updates)) {
        const sentinel = values.get(param)?.sentinel ?? BUILD_FILTER_ALL;
        normalized[param] = value === sentinel ? null : value;
      }
      writeParams(normalized);
    },
    [values, writeParams],
  );

  const setValue = useCallback(
    (param: string, value: string) => setValues({ [param]: value }),
    [setValues],
  );

  const setCursor = useCallback(
    (nextCursor: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (nextCursor) next.set(BUILD_LIST_CURSOR_PARAM, nextCursor);
      else next.delete(BUILD_LIST_CURSOR_PARAM);
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    const updates: Record<string, string | null> = {};
    for (const definition of filters) updates[definition.param] = null;
    if (withSearch) updates[searchParam] = null;
    pendingSearchWrites.current.delete("");
    if (withSearch && urlSearch !== "") pendingSearchWrites.current.add("");
    writtenSearch.current = null;
    setIsEditingSearch(false);
    setSearchState("");
    writeParams(updates);
  }, [filters, searchParam, urlSearch, withSearch, writeParams]);

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

  const base: BuildListFiltersStateBase = {
    cursor,
    setCursor,
    value,
    isActive,
    setValue,
    setValues,
    clearAll,
    activeCount,
    isFiltered: activeCount > 0 || (withSearch ? debouncedSearch.length > 0 : false),
    resetKey,
    isPending,
  };

  if (!withSearch) return base;

  return {
    ...base,
    search,
    debouncedSearch,
    setSearch,
  };
}
