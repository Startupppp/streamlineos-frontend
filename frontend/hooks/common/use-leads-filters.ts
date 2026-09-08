"use client";

import { useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const LEADS_VIEWS = ["table", "kanban", "funnel"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type LeadsView = (typeof LEADS_VIEWS)[number];

export interface LeadsFilters {
  view: LeadsView;
  searchQuery: string;
  statusFilter: string | undefined;
  priorityFilter: string | undefined;
  sourceFilter: string | undefined;
  sortColumn: string;
  sortDirection: (typeof SORT_DIRECTIONS)[number];
  pageSize: number;
}

export interface UseLeadsFiltersReturn extends LeadsFilters {
  setView: (v: LeadsView) => void;
  setSearchQuery: (q: string) => void;
  setStatusFilter: (s: string | undefined) => void;
  setPriorityFilter: (p: string | undefined) => void;
  setSourceFilter: (s: string | undefined) => void;
  setSort: (col: string, dir: "asc" | "desc") => void;
  setPageSize: (size: number) => void;
  clearFilters: () => void;
  isPending: boolean;
}

function parseOptional(v: string | null): string | undefined {
  return v || undefined;
}

/**
 * A URL segment is a bare `string`, so narrowing it with `as LeadsView` claimed
 * a membership nobody checked — `?view=nonsense` reached the switch and fell
 * through every branch. Reading the member back out of the tuple the union is
 * DERIVED from means the guard cannot drift from the type.
 */
function parseView(v: string | null): LeadsView {
  return LEADS_VIEWS.find((candidate) => candidate === v) ?? "table";
}

function parseSortDirection(v: string | null): LeadsFilters["sortDirection"] {
  return SORT_DIRECTIONS.find((candidate) => candidate === v) ?? "desc";
}

export function useLeadsFilters(): UseLeadsFiltersReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const view = parseView(searchParams.get("view"));
  const searchQuery = searchParams.get("q") || "";
  const statusFilter = parseOptional(searchParams.get("status"));
  const priorityFilter = parseOptional(searchParams.get("priority"));
  const sourceFilter = parseOptional(searchParams.get("source"));
  const sortColumn = searchParams.get("sortBy") || "createdAt";
  const sortDirection = parseSortDirection(searchParams.get("order"));
  const pageSize = Number(searchParams.get("size")) || 50;

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const setView = useCallback(
    (v: LeadsView) => {
      update({ view: v });

      if (typeof window !== "undefined") localStorage.setItem("leads-view", v);
    },
    [update],
  );

  const setSearchQuery = useCallback(
    (q: string) => update({ q: q || null }),
    [update],
  );

  const setStatusFilter = useCallback(
    (s: string | undefined) => update({ status: s || null }),
    [update],
  );

  const setPriorityFilter = useCallback(
    (p: string | undefined) => update({ priority: p || null }),
    [update],
  );

  const setSourceFilter = useCallback(
    (s: string | undefined) => update({ source: s || null }),
    [update],
  );

  const setSort = useCallback(
    (col: string, dir: "asc" | "desc") => update({ sortBy: col, order: dir }),
    [update],
  );

  const setPageSize = useCallback(
    (size: number) => update({ size: String(size) }),
    [update],
  );

  const clearFilters = useCallback(
    () => update({ status: null, priority: null, source: null, q: null }),
    [update],
  );

  return {
    view,
    searchQuery,
    statusFilter,
    priorityFilter,
    sourceFilter,
    sortColumn,
    sortDirection,
    pageSize,
    setView,
    setSearchQuery,
    setStatusFilter,
    setPriorityFilter,
    setSourceFilter,
    setSort,
    setPageSize,
    clearFilters,
    isPending,
  };
}
