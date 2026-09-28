"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildListSearchParams,
  parsePriorityParam,
  parseTicketTypeParam,
} from "../shared/use-build-list-url-state";
import type { TicketOrderBy, TicketOrderDir } from "@/hooks/api/build/ticket-queries";

const VALID_ORDER_BY = new Set<TicketOrderBy>(["created", "updated", "priority", "dueDate", "rank"]);
const VALID_ORDER_DIR = new Set<TicketOrderDir>(["asc", "desc"]);

const DISPLAY_ORDER_ALIASES: Readonly<Record<string, TicketOrderBy>> = { manual: "rank" };

export function parseBoardOrderBy(v: string | null): TicketOrderBy | undefined {
  if (!v) return undefined;
  const aliased = DISPLAY_ORDER_ALIASES[v];
  if (aliased !== undefined) return aliased;
  return VALID_ORDER_BY.has(v as TicketOrderBy) ? (v as TicketOrderBy) : undefined;
}

export function parseBoardOrderDir(v: string | null): TicketOrderDir | undefined {
  if (!v) return undefined;
  return VALID_ORDER_DIR.has(v as TicketOrderDir) ? (v as TicketOrderDir) : undefined;
}

export function useBoardFilterParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const rawPriority = searchParams.get("priority");
  const rawType = searchParams.get("type");
  const filterPriority = parsePriorityParam(rawPriority) ?? "";
  const filterType = parseTicketTypeParam(rawType) ?? "";
  const filterAssigneeId = searchParams.get("assigneeId") ?? "";
  const filterLabels = searchParams.get("labels") ?? "";
  const filterCycle = searchParams.get("cycle") ?? "";
  const filterModule = searchParams.get("module") ?? "";
  const dueDateFrom = searchParams.get("dueDateFrom") ?? "";
  const dueDateTo = searchParams.get("dueDateTo") ?? "";
  const filterSeverity = searchParams.get("severity") ?? "";
  const filterQaState = searchParams.get("qaState") ?? "";
  const sortOrderBy = parseBoardOrderBy(searchParams.get("orderBy"));
  const sortOrderDir = parseBoardOrderDir(searchParams.get("orderDir"));

  const boardFilters = useMemo(
    () => ({
      q: q || undefined,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      type: filterType || undefined,
      assigneeId: filterAssigneeId || undefined,
      labels: filterLabels || undefined,
      cycle: filterCycle || undefined,
      module: filterModule || undefined,
      dueDateFrom: dueDateFrom || undefined,
      dueDateTo: dueDateTo || undefined,
      orderBy: sortOrderBy,
      orderDir: sortOrderDir,
    }),
    [
      q,
      filterStatus,
      filterPriority,
      filterType,
      filterAssigneeId,
      filterLabels,
      filterCycle,
      filterModule,
      dueDateFrom,
      dueDateTo,
      sortOrderBy,
      sortOrderDir,
    ],
  );

  useEffect(() => {
    const updates: Record<string, string | null> = {};
    let changed = false;
    if (rawPriority && !filterPriority) {
      updates.priority = null;
      changed = true;
    }
    if (rawType && !filterType) {
      updates.type = null;
      changed = true;
    }
    if (!changed) return;
    const next = buildListSearchParams(searchParams, updates, {
      resetCursor: true,
    });
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [filterPriority, filterType, pathname, rawPriority, rawType, router, searchParams]);

  const hasActiveFilters = !!(
    q ||
    filterStatus ||
    filterPriority ||
    filterType ||
    filterAssigneeId ||
    filterLabels ||
    filterCycle ||
    filterModule ||
    dueDateFrom ||
    dueDateTo ||
    filterSeverity ||
    filterQaState
  );

  const activeFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    if (q) filters.q = q;
    if (filterStatus) filters.status = filterStatus;
    if (filterPriority) filters.priority = filterPriority;
    if (filterType) filters.type = filterType;
    if (filterAssigneeId) filters.assigneeId = filterAssigneeId;
    if (filterLabels) filters.labels = filterLabels;
    if (filterCycle) filters.cycle = filterCycle;
    if (filterModule) filters.module = filterModule;
    if (dueDateFrom) filters.dueDateFrom = dueDateFrom;
    if (dueDateTo) filters.dueDateTo = dueDateTo;
    if (filterSeverity) filters.severity = filterSeverity;
    if (filterQaState) filters.qaState = filterQaState;
    return filters;
  }, [
    q,
    filterStatus,
    filterPriority,
    filterType,
    filterAssigneeId,
    filterLabels,
    filterCycle,
    filterModule,
    dueDateFrom,
    dueDateTo,
    filterSeverity,
    filterQaState,
  ]);

  return {
    q,
    filterStatus,
    filterPriority,
    filterType,
    filterAssigneeId,
    filterLabels,
    filterCycle,
    filterModule,
    filterSeverity,
    filterQaState,
    sortOrderBy,
    sortOrderDir,
    boardFilters,
    activeFilters,
    hasActiveFilters,
  };
}
