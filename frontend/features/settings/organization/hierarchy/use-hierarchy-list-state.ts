"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  DEFAULT_PAGE_SIZE,
  getLastPage,
  parsePage,
  parsePageSize,
} from "@/lib/list-pagination";

type HierarchyListStatus = "CURRENT" | "ARCHIVED";

type HierarchyListParamUpdates = Partial<{
  page: string | null;
  search: string | null;
  size: string | null;
  status: string | null;
}>;

export function hierarchyStatusFromParam(
  value: string | null,
): HierarchyListStatus {
  return value?.toLowerCase() === "archived" ? "ARCHIVED" : "CURRENT";
}

export function applyHierarchyListParamUpdates(
  current: string,
  updates: HierarchyListParamUpdates,
): string {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) params.delete(key);
    else if (value !== undefined) params.set(key, value);
  }
  return params.toString();
}

export function useHierarchyPageBounds({
  page,
  pageSize,
  total,
  setPage,
}: {
  page: number;
  pageSize: number;
  total: number | undefined;
  setPage: (page: number) => void;
}): boolean {
  const lastPage = total === undefined ? page : getLastPage(total, pageSize);
  const isCorrectingPage = total !== undefined && page > lastPage;

  useEffect(() => {
    if (isCorrectingPage) setPage(lastPage);
  }, [isCorrectingPage, lastPage, setPage]);

  return isCorrectingPage;
}

export function useHierarchyListState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const paramsSnapshot = searchParams.toString();

  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("size"));
  const status = hierarchyStatusFromParam(searchParams.get("status"));
  const serverSearch = (searchParams.get("search") ?? "").trim();
  const [search, setSearch] = useState(serverSearch);
  const debouncedSearch = useDebouncedValue(search, 300);

  const updateParams = useCallback(
    (updates: HierarchyListParamUpdates) => {
      const nextQuery = applyHierarchyListParamUpdates(
        paramsSnapshot,
        updates,
      );
      const href = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      startTransition(() => router.replace(href, { scroll: false }));
    },
    [paramsSnapshot, pathname, router],
  );

  useEffect(() => {
    setSearch(serverSearch);
  }, [serverSearch]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();
    if (normalizedSearch === serverSearch) return;
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

  const setStatus = useCallback(
    (nextStatus: HierarchyListStatus) => {
      updateParams({
        status: nextStatus === "ARCHIVED" ? "archived" : null,
        page: null,
      });
    },
    [updateParams],
  );

  const toggleArchived = useCallback(() => {
    setStatus(status === "ARCHIVED" ? "CURRENT" : "ARCHIVED");
  }, [setStatus, status]);

  return {
    page,
    pageSize,
    status,
    showArchived: status === "ARCHIVED",
    search,
    serverSearch,
    setSearch,
    setPage,
    setPageSize,
    setStatus,
    toggleArchived,
    query: {
      page,
      limit: pageSize,
      search: serverSearch || undefined,
      status,
    },
  };
}
