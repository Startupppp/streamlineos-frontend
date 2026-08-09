"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  DEFAULT_PAGE_SIZE,
  parsePage,
  parsePageSize,
} from "@/lib/list-pagination";

type RoleListParamUpdates = Partial<{
  page: string | null;
  search: string | null;
  size: string | null;
}>;

export function applyRoleListParamUpdates(
  current: string,
  updates: RoleListParamUpdates,
): string {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") params.delete(key);
    else if (value !== undefined) params.set(key, value);
  }
  return params.toString();
}

export function useRoleListState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const paramsSnapshot = searchParams.toString();
  const latestParamsRef = useRef(paramsSnapshot);

  const page = parsePage(searchParams.get("page"));
  const limit = parsePageSize(searchParams.get("size"));
  const serverSearch = (searchParams.get("search") ?? "").trim();
  const [search, setSearch] = useState(serverSearch);
  const debouncedSearch = useDebouncedValue(search, 300);
  const requestedSearchRef = useRef<string | null>(null);

  const updateParams = useCallback(
    (updates: RoleListParamUpdates) => {
      const nextQuery = applyRoleListParamUpdates(
        latestParamsRef.current,
        updates,
      );
      latestParamsRef.current = nextQuery;
      const href = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      startTransition(() => router.replace(href, { scroll: false }));
    },
    [pathname, router],
  );

  useEffect(() => {
    latestParamsRef.current = paramsSnapshot;
  }, [paramsSnapshot]);

  useEffect(() => {
    if (requestedSearchRef.current === serverSearch) {
      requestedSearchRef.current = null;
      return;
    }
    // Browser history can change URL state without an input event.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(serverSearch);
  }, [serverSearch]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();
    if (normalizedSearch === serverSearch) return;
    requestedSearchRef.current = normalizedSearch;
    updateParams({
      search: normalizedSearch || null,
      page: null,
    });
  }, [debouncedSearch, serverSearch, updateParams]);

  const setPage = useCallback(
    (nextPage: number) => {
      updateParams({ page: nextPage <= 1 ? null : String(nextPage) });
    },
    [updateParams],
  );

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      const validPageSize = parsePageSize(String(nextPageSize));
      updateParams({
        size:
          validPageSize === DEFAULT_PAGE_SIZE
            ? null
            : String(validPageSize),
        page: null,
      });
    },
    [updateParams],
  );

  const query = {
    page,
    limit,
    search: serverSearch || undefined,
  };

  return {
    page,
    limit,
    search,
    serverSearch,
    setSearch,
    setPage,
    setPageSize,
    query,
  };
}
