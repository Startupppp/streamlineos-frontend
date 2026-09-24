"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AllWorkFilters } from "@/types/projects";

const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const VALID_TICKET_TYPES = new Set([
  "TASK",
  "BUG",
  "STORY",
  "EPIC",
  "SUBTASK",
]);

export const BUILD_LIST_SORT_FIELDS = [
  "rank",
  "created",
  "updated",
  "priority",
  "dueDate",
] as const;

export const BUILD_LIST_SORT_DIRECTIONS = ["asc", "desc"] as const;

export const BUILD_LIST_GROUPINGS = [
  "none",
  "project",
  "status",
  "priority",
  "assignee",
] as const;

export type BuildListSortField = (typeof BUILD_LIST_SORT_FIELDS)[number];
export type BuildListSortDirection =
  (typeof BUILD_LIST_SORT_DIRECTIONS)[number];
export type BuildListGrouping = (typeof BUILD_LIST_GROUPINGS)[number];

export const BUILD_LIST_FILTER_PARAMS = [
  "q",
  "status",
  "priority",
  "type",
  "assigneeId",
  "labels",
  "projectIds",
  "projectId",
  "cycleId",
  "dueDateFrom",
  "dueDateTo",
] as const;

export const BUILD_LIST_SHAPE_PARAMS = [
  ...BUILD_LIST_FILTER_PARAMS,
  "group",
  "sort",
  "dir",
] as const;

export const BUILD_LIST_CURSOR_PARAM = "cursor";

function parseEnumCsv(raw: string | null, allowed: ReadonlySet<string>): string | undefined {
  if (!raw) return undefined;
  const values = Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter((value) => allowed.has(value)),
    ),
  );
  return values.length > 0 ? values.join(",") : undefined;
}

export function parsePriorityParam(raw: string | null): string | undefined {
  return parseEnumCsv(raw, VALID_PRIORITIES);
}

export function parseTicketTypeParam(raw: string | null): string | undefined {
  return parseEnumCsv(raw, VALID_TICKET_TYPES);
}

export function parseSortField(
  raw: string | null,
  fallback: BuildListSortField,
): BuildListSortField {
  const match = BUILD_LIST_SORT_FIELDS.find((field) => field === raw);
  return match ?? fallback;
}

export function parseSortDirection(
  raw: string | null,
  fallback: BuildListSortDirection,
): BuildListSortDirection {
  const match = BUILD_LIST_SORT_DIRECTIONS.find(
    (direction) => direction === raw,
  );
  return match ?? fallback;
}

export function parseGrouping(
  raw: string | null,
  fallback: BuildListGrouping,
): BuildListGrouping {
  const match = BUILD_LIST_GROUPINGS.find((grouping) => grouping === raw);
  return match ?? fallback;
}

export interface BuildListUrlStateOptions {
  limit?: number;
  defaultSortField?: BuildListSortField;
  defaultSortDirection?: BuildListSortDirection;
  defaultGrouping?: BuildListGrouping;
  scope?: AllWorkFilters["scope"];
}

export interface BuildListUrlState {
  filters: AllWorkFilters;
  grouping: BuildListGrouping;
  sortField: BuildListSortField;
  sortDirection: BuildListSortDirection;
  cursor: string | null;
  hasActiveFilters: boolean;
  isPending: boolean;
  setListParams: (updates: Record<string, string | null>) => void;
  setCursor: (cursor: string | null) => void;
  clearFilters: () => void;
}

export function buildListSearchParams(
  current: URLSearchParams,
  updates: Record<string, string | null>,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  const shapeChanged = Object.keys(updates).some((key) =>
    BUILD_LIST_SHAPE_PARAMS.some((shapeParam) => shapeParam === key),
  );
  if (shapeChanged) next.delete(BUILD_LIST_CURSOR_PARAM);
  return next;
}

export function clearedListSearchParams(
  current: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const param of BUILD_LIST_FILTER_PARAMS) next.delete(param);
  next.delete(BUILD_LIST_CURSOR_PARAM);
  return next;
}

export function useBuildListUrlState(
  options: BuildListUrlStateOptions = {},
): BuildListUrlState {
  const {
    limit = 50,
    defaultSortField = "rank",
    defaultSortDirection = "desc",
    defaultGrouping = "none",
    scope,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const grouping = parseGrouping(searchParams.get("group"), defaultGrouping);
  const sortField = parseSortField(searchParams.get("sort"), defaultSortField);
  const sortDirection = parseSortDirection(
    searchParams.get("dir"),
    defaultSortDirection,
  );
  const cursor = searchParams.get(BUILD_LIST_CURSOR_PARAM);

  const replaceWith = useCallback(
    (next: URLSearchParams) => {
      startTransition(() => {
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  const setListParams = useCallback(
    (updates: Record<string, string | null>) => {
      replaceWith(buildListSearchParams(searchParams, updates));
    },
    [replaceWith, searchParams],
  );

  const setCursor = useCallback(
    (nextCursor: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (nextCursor) {
        next.set(BUILD_LIST_CURSOR_PARAM, nextCursor);
      } else {
        next.delete(BUILD_LIST_CURSOR_PARAM);
      }
      replaceWith(next);
    },
    [replaceWith, searchParams],
  );

  const clearFilters = useCallback(() => {
    replaceWith(clearedListSearchParams(searchParams));
  }, [replaceWith, searchParams]);

  const filters = useMemo<AllWorkFilters>(() => {
    const next: AllWorkFilters = { limit };

    const search = searchParams.get("q");
    if (search) next.search = search;

    const status = searchParams.get("status");
    if (status) next.status = status;

    const priority = parsePriorityParam(searchParams.get("priority"));
    if (priority) next.priority = priority;

    const type = parseTicketTypeParam(searchParams.get("type"));
    if (type) next.type = type;

    const assigneeId = searchParams.get("assigneeId");
    if (assigneeId) next.assigneeId = assigneeId;

    const labels = searchParams.get("labels");
    if (labels) next.labelIds = labels;

    const singleProjectId = searchParams.get("projectId");
    const projectIds = searchParams.get("projectIds");
    const resolvedProjectIds = singleProjectId ?? projectIds;
    if (resolvedProjectIds) next.projectIds = resolvedProjectIds;

    const cycleId = searchParams.get("cycleId");
    if (cycleId) next.cycleId = cycleId;

    const dueDateFrom = searchParams.get("dueDateFrom");
    if (dueDateFrom) next.dueDateFrom = dueDateFrom;

    const dueDateTo = searchParams.get("dueDateTo");
    if (dueDateTo) next.dueDateTo = dueDateTo;

    next.orderBy = sortField;
    next.orderDir = sortDirection;

    if (cursor) next.cursor = cursor;
    if (scope) next.scope = scope;

    return next;
  }, [
    cursor,
    limit,
    scope,
    searchParams,
    sortDirection,
    sortField,
  ]);

  const hasActiveFilters = useMemo(
    () =>
      BUILD_LIST_FILTER_PARAMS.some((param) => {
        const raw = searchParams.get(param);
        if (!raw) return false;
        if (param === "priority") return parsePriorityParam(raw) !== undefined;
        if (param === "type") return parseTicketTypeParam(raw) !== undefined;
        return true;
      }),
    [searchParams],
  );

  return {
    filters,
    grouping,
    sortField,
    sortDirection,
    cursor,
    hasActiveFilters,
    isPending,
    setListParams,
    setCursor,
    clearFilters,
  };
}
