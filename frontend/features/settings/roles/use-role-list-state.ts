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

  const limit = parsePageSize(searchParams.get("size"));
  const serverSearch = (searchParams.get("search") ?? "").trim();
  const [search, setSearch] = useState(serverSearch);
  const debouncedSearch = useDebouncedValue(search, 300);
  const requestedSearchRef = useRef<string | null>(null);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const page = cursors.length;

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
    setCursors([undefined]);
    updateParams({
      search: normalizedSearch || null,
      page: null,
    });
  }, [debouncedSearch, serverSearch, updateParams]);

  const nextPage = useCallback((cursor: string | null) => {
    if (cursor) setCursors((current) => [...current, cursor]);
  }, []);

  const previousPage = useCallback(() => {
    setCursors((current) => current.slice(0, -1));
  }, []);

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      const validPageSize = parsePageSize(String(nextPageSize));
      setCursors([undefined]);
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
    cursor: cursors.at(-1),
    limit,
    search: serverSearch || undefined,
  };

  return {
    page,
    limit,
    search,
    serverSearch,
    setSearch,
    nextPage,
    previousPage,
    setPageSize,
    query,
  };
}
