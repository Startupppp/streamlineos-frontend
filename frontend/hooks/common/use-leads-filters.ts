"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";

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

export function useLeadsFilters(): UseLeadsFiltersReturn {
  const searchParams = useSearchParams();
  const { update, isPending } = useUrlFilters();

  const view = parseEnum(searchParams.get("view"), LEADS_VIEWS, "table");
  const searchQuery = searchParams.get("q") || "";
  const statusFilter = parseOptional(searchParams.get("status"));
  const priorityFilter = parseOptional(searchParams.get("priority"));
  const sourceFilter = parseOptional(searchParams.get("source"));
  const sortColumn = searchParams.get("sortBy") || "createdAt";
  const sortDirection = parseEnum(searchParams.get("order"), SORT_DIRECTIONS, "desc");
  const pageSize = Number(searchParams.get("size")) || 50;

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
