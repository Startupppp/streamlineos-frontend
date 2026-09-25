"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api";
import { useViews, useProjectBoardTickets } from "@/hooks/api/build";
import { useBugs } from "@/hooks/api/build/bugs";
import { useBoardSavedViews } from "./use-board-saved-views";
import { applyDisplayOptionParams, hydrateDisplayOptions, useDisplayOptions, writeDisplayOptionParams } from "./use-display-options";
import type { DisplayOptions } from "@/features/build/shared/types";
import { parseViewType, type ViewType } from "./view-switcher";
import { fromSavedViewLayout } from "@/lib/build/view-types";
import { INITIAL_FILTERS, type FilterState as WorkloadFilterState } from "./workload-types";
import type { KanbanTicket } from "@/features/build/shared/types";
import { mapBoardTicketToKanban } from "@/features/build/my-tickets/map-board-ticket";
import { filterHiddenCompletedTickets, getCompletedStatusNames } from "@/features/build/shared/completed-status";
import {
  buildTicketCollectionReturnHref,
  buildTicketDetailUrl,
} from "@/features/build/ticket-details/build-ticket-detail-url";
import { currentSearchParams } from "@/lib/current-search-params";

export type ProjectStatus = {
  id: number;
  name: string;
  color: string | null;
  order: number;
  wipLimit?: number | null;
  type?: string | null;
};

export type BoardMember = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
};

export function useBoardUrlState(
  projectId: number,
  defaultView: ViewType = "board",
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const view: ViewType = parseViewType(searchParams.get("view") ?? defaultView);
  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;
  const commentParam = searchParams.get("comment");
  const highlightCommentId = commentParam ? parseInt(commentParam) : null;
  const viewId = searchParams.get("viewId");
  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";
  const filterAssigneeId = searchParams.get("assigneeId") ?? "";
  const filterLabels = searchParams.get("labels") ?? "";
  const filterCycle = searchParams.get("cycle") ?? "";
  const filterModule = searchParams.get("module") ?? "";
  const filterSeverity = searchParams.get("severity") ?? "";
  const filterQaState = searchParams.get("qaState") ?? "";
  const createParamOpen = searchParams.get("create") === "1";
  const createCycleParam = searchParams.get("cycleId");
  const createDefaultCycleId =
    createCycleParam === null
      ? undefined
      : createCycleParam === "none" || createCycleParam === ""
        ? null
        : Number.isFinite(Number(createCycleParam))
          ? Number(createCycleParam)
          : undefined;

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
    ],
  );

  // `isError` travels with the rows: the ticket list flattens `query.data?.pages`
  // into `[]`, so a 500 on GET /build/:id/tickets is indistinguishable
  // downstream from a project that genuinely has no tickets — and the board then
  // renders "No tickets yet" over a project with 1,850 of them.
  const {
    data: boardTickets,
    isLoading: ticketsLoading,
    isError: ticketsError,
    error: ticketsErrorValue,
    refetch: refetchTickets,
    isTruncated,
    fetchNextPage: fetchMoreTickets,
    isFetchingNextPage: isFetchingMoreTickets,
  } = useProjectBoardTickets(projectId, boardFilters);
  const { data } = useProject(projectId);
  const { data: views } = useViews(projectId);
  const appliedViewIdRef = useRef<string | null>(null);

  const [storedDisplayOptions, setStoredDisplayOptions] =
    useDisplayOptions(projectId);

  const displayOptions = useMemo(
    () => applyDisplayOptionParams(storedDisplayOptions, searchParams),
    [storedDisplayOptions, searchParams],
  );

  const setDisplayOptions = useCallback(
    (next: DisplayOptions) => {
      setStoredDisplayOptions(next);
      const params = writeDisplayOptionParams(
        currentSearchParams(searchParams),
        next,
      );
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [setStoredDisplayOptions, searchParams, router],
  );
  const [hideCompleted, setHideCompleted] = useState(true);
  const [workloadFilters, setWorkloadFilters] =
    useState<WorkloadFilterState>(INITIAL_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );

  useEffect(() => {
    if (!viewId || !views) return;
    if (appliedViewIdRef.current === viewId) return;
    const savedView = views.find((v) => v.id.toString() === viewId);
    if (!savedView) return;
    appliedViewIdRef.current = viewId;
    const next = currentSearchParams(searchParams);
    if (savedView.filters && typeof savedView.filters === "object") {
      for (const [k, val] of Object.entries(savedView.filters)) {
        if (typeof val === "string" && val) next.set(k, val);
        else next.delete(k);
      }
    }
    if (savedView.layoutType)
      next.set("view", fromSavedViewLayout(savedView.layoutType));
    if (
      savedView.displayOptions &&
      Object.keys(savedView.displayOptions).length > 0
    ) {
      const hydrated = hydrateDisplayOptions(savedView.displayOptions);
      setStoredDisplayOptions(hydrated);
      writeDisplayOptionParams(next, hydrated);
    }
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [viewId, views, searchParams, router, setStoredDisplayOptions]);

  const activeView = viewId
    ? views?.find((v) => v.id.toString() === viewId)
    : null;

  const allTickets: KanbanTicket[] = useMemo(() => {
    if (!boardTickets) return [];
    return boardTickets.map(mapBoardTicketToKanban);
  }, [boardTickets]);

  const statuses =
    data && "statuses" in data ? (data.statuses as ProjectStatus[]) : undefined;

  const qaFilterActive =
    filterType === "BUG" && !!(filterSeverity || filterQaState);

  const { data: qaMatches, isLoading: qaMatchesLoading } = useBugs(
    qaFilterActive ? projectId : undefined,
    {
      severity: filterSeverity || undefined,
      status: filterQaState || undefined,
    },
  );

  const qaMatchIds = useMemo(() => {
    if (!qaFilterActive || !qaMatches) return null;
    return new Set(qaMatches.map((bug) => bug.id));
  }, [qaFilterActive, qaMatches]);

  const filteredTickets = useMemo(() => {
    let tickets = filterHiddenCompletedTickets(
      allTickets,
      hideCompleted,
      statuses,
    );
    if (qaMatchIds) {
      tickets = tickets.filter((ticket) => qaMatchIds.has(Number(ticket.id)));
    }
    if (displayOptions.completedIssues !== "all") {
      if (displayOptions.completedIssues === "none") {
        tickets = filterHiddenCompletedTickets(tickets, true, statuses);
      } else {
        const cutoff = new Date();
        if (displayOptions.completedIssues === "last-day")
          cutoff.setDate(cutoff.getDate() - 1);
        else if (displayOptions.completedIssues === "last-week")
          cutoff.setDate(cutoff.getDate() - 7);
        else if (displayOptions.completedIssues === "last-month")
          cutoff.setMonth(cutoff.getMonth() - 1);
        const completedStatuses = getCompletedStatusNames(statuses);
        tickets = tickets.filter(
          (t) =>
            !completedStatuses.has(t.status) ||
            !t.updatedAt ||
            new Date(t.updatedAt) >= cutoff,
        );
      }
    }
    return tickets;
  }, [
    allTickets,
    hideCompleted,
    displayOptions.completedIssues,
    statuses,
    qaMatchIds,
  ]);

  const members: BoardMember[] = useMemo(() => {
    if (!data?.members) return [];
    return data.members.flatMap((member) => {
      if (!member.user) return [];
      return [{
        id: member.user.id,
        name: member.user.name ?? null,
        firstName: member.user.firstName ?? null,
        lastName: member.user.lastName ?? null,
        image: member.user.image ?? null,
      }];
    });
  }, [data?.members]);

  const wipLimits = useMemo<Record<string, number>>(() => {
    if (!statuses) return {};
    const result: Record<string, number> = {};
    for (const s of statuses) {
      if (s.wipLimit != null) result[s.name] = s.wipLimit;
    }
    return result;
  }, [statuses]);

  const doneCount = useMemo(() => {
    const completedStatuses = getCompletedStatusNames(statuses);
    return allTickets.filter((t) => completedStatuses.has(t.status)).length;
  }, [allTickets, statuses]);

  const hasActiveFilters = !!(
    q ||
    filterStatus ||
    filterPriority ||
    filterType ||
    filterAssigneeId ||
    filterLabels ||
    filterCycle ||
    filterModule ||
    filterSeverity ||
    filterQaState
  );
  const showEmptyFilterState =
    !ticketsLoading &&
    !qaMatchesLoading &&
    hasActiveFilters &&
    filteredTickets.length === 0;

  const ticketCollectionReturnHref = useMemo(
    () => buildTicketCollectionReturnHref(projectId, pathname, searchParams),
    [projectId, pathname, searchParams],
  );

  const handleClearView = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("viewId");
    appliedViewIdRef.current = null;
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

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
    filterSeverity,
    filterQaState,
  ]);

  const {
    createView,
    updateView,
    saveViewOpen,
    setSaveViewOpen,
    saveViewName,
    handleSaveView,
    handleUpdateActiveView,
    handleSaveViewNameChange,
    handleOpenSaveView,
  } = useBoardSavedViews({
    projectId,
    view,
    activeView,
    filters: activeFilters,
    displayOptions,
  });

  const handleViewChange = useCallback(
    (v: ViewType) => {
      if (v === "calendar") {
        const p = currentSearchParams(searchParams);
        p.delete("view");
        p.delete("viewId");
        p.delete("ticket");
        p.delete("comment");
        p.set("source", "build");
        p.set("projectId", String(projectId));
        router.push(`/calendar?${p.toString()}`);
        setSelectedIds(new Set());
        return;
      }
      if (v === "workload") {
        const p = currentSearchParams(searchParams);
        p.delete("view");
        const qs = p.toString();
        router.push(`/build/${projectId}/workload${qs ? `?${qs}` : ""}`);
        setSelectedIds(new Set());
        return;
      }
      const p = currentSearchParams(searchParams);
      p.set("view", v);
      if (pathname === `/build/${projectId}/workload`) {
        router.push(`/build/${projectId}/issues?${p.toString()}`);
        setSelectedIds(new Set());
        return;
      }
      router.replace(`?${p.toString()}`, { scroll: false });
      setSelectedIds(new Set());
    },
    [router, searchParams, projectId, pathname],
  );

  const handleWorkloadFilterChange = useCallback(
    <K extends keyof WorkloadFilterState>(
      key: K,
      value: WorkloadFilterState[K],
    ) => {
      setWorkloadFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleClearWorkloadFilters = useCallback(() => {
    setWorkloadFilters(INITIAL_FILTERS);
  }, []);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(
        projectId,
        data?.key,
        id,
        allTickets,
        undefined,
        ticketCollectionReturnHref,
      );
      if (href) router.push(href);
    },
    [router, projectId, data?.key, allTickets, ticketCollectionReturnHref],
  );

  useEffect(() => {
    if (!selectedTicketId || !data) return;
    const href = buildTicketDetailUrl(
      projectId,
      data.key,
      selectedTicketId,
      allTickets,
      highlightCommentId,
      ticketCollectionReturnHref,
    );
    if (href) router.replace(href);
  }, [
    selectedTicketId,
    data,
    allTickets,
    projectId,
    highlightCommentId,
    ticketCollectionReturnHref,
    router,
  ]);

  const handleClearSearch = useCallback(() => {
    const next = currentSearchParams(searchParams);
    next.delete("q");
    next.delete("status");
    next.delete("priority");
    next.delete("type");
    next.delete("assigneeId");
    next.delete("labels");
    next.delete("cycle");
    next.delete("module");
    next.delete("severity");
    next.delete("qaState");
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleQaFilterChange = useCallback(
    (key: "severity" | "qaState", value: string) => {
      const next = currentSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      const next = currentSearchParams(searchParams);
      next.delete("create");
      next.delete("cycleId");
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSelectionChange = useCallback((sel: Set<string | number>) => {
    setSelectedIds(sel);
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    view,
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
    selectedTicketId,
    highlightCommentId,
    viewId,
    createParamOpen,
    createDefaultCycleId,
    activeView,
    displayOptions,
    setDisplayOptions,
    hideCompleted,
    setHideCompleted,
    workloadFilters,
    saveViewOpen,
    setSaveViewOpen,
    saveViewName,
    createView,
    updateView,
    selectedIds,
    ticketsLoading,
    ticketsError,
    ticketsErrorValue,
    refetchTickets,
    isTruncated,
    fetchMoreTickets,
    isFetchingMoreTickets,
    allTickets,
    filteredTickets,
    statuses,
    members,
    wipLimits,
    doneCount,
    showEmptyFilterState,
    hasActiveFilters,
    handleViewChange,
    handleClearSearch,
    handleQaFilterChange,
    handleClearView,
    handleCreateOpenChange,
    handleOpenSaveView,
    handleSaveViewNameChange,
    handleSaveView,
    handleUpdateActiveView,
    handleWorkloadFilterChange,
    handleClearWorkloadFilters,
    handleTicketSelect,
    handleSelectionChange,
    handleClearSelection,
  };
}
