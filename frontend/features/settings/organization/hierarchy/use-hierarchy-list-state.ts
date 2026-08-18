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
  parsePageSize,
} from "@/lib/list-pagination";

type HierarchyListStatus = "CURRENT" | "ARCHIVED";

type HierarchyListParamUpdates = Partial<{
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
  params.delete("page");
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) params.delete(key);
    else if (value !== undefined) params.set(key, value);
  }
  return params.toString();
}

export function useHierarchyListState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const paramsSnapshot = searchParams.toString();

  const pageSize = parsePageSize(searchParams.get("size"));
  const status = hierarchyStatusFromParam(searchParams.get("status"));
  const serverSearch = (searchParams.get("search") ?? "").trim();
  const [search, setSearch] = useState(serverSearch);
  const debouncedSearch = useDebouncedValue(search, 300);
  const cursorResetKey = `${pageSize}\u0000${status}\u0000${serverSearch}`;
  const [cursorState, setCursorState] = useState<{
    key: string;
    history: Array<string | undefined>;
  }>({ key: cursorResetKey, history: [undefined] });
  const cursorHistory =
    cursorState.key === cursorResetKey ? cursorState.history : [undefined];
  const cursor = cursorHistory.at(-1);
  const page = cursorHistory.length;

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
    });
  }, [debouncedSearch, serverSearch, updateParams]);

  const nextPage = useCallback(
    (nextCursor: string | null | undefined) => {
      if (!nextCursor) return;
      setCursorState((current) => {
        const history =
          current.key === cursorResetKey ? current.history : [undefined];
        if (history.at(-1) === nextCursor) return { key: cursorResetKey, history };
        return { key: cursorResetKey, history: [...history, nextCursor] };
      });
    },
    [cursorResetKey],
  );

  const previousPage = useCallback(() => {
    setCursorState((current) => {
      const history =
        current.key === cursorResetKey ? current.history : [undefined];
      return {
        key: cursorResetKey,
        history: history.length > 1 ? history.slice(0, -1) : history,
      };
    });
  }, [cursorResetKey]);

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      const validPageSize = parsePageSize(String(nextPageSize));
      updateParams({
        size:
          validPageSize === DEFAULT_PAGE_SIZE
            ? null
            : String(validPageSize),
      });
    },
    [updateParams],
  );

  const setStatus = useCallback(
    (nextStatus: HierarchyListStatus) => {
      updateParams({
        status: nextStatus === "ARCHIVED" ? "archived" : null,
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
    nextPage,
    previousPage,
    setPageSize,
    setStatus,
    toggleArchived,
    query: {
      cursor,
      limit: pageSize,
      search: serverSearch || undefined,
      status,
    },
  };
}
