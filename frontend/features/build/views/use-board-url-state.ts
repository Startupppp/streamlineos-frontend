"use client";

import { useState, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api/build/projects";
import { useViews } from "@/hooks/api/build/views";
import { useProjectBoardTickets } from "@/hooks/api/build/tickets";
import { useBugs } from "@/hooks/api/build/bugs";
import { useBoardSavedViews } from "./use-board-saved-views";
import { applyDisplayOptionParams, useDisplayOptions, writeDisplayOptionParams } from "./use-display-options";
import type { DisplayOptions } from "@/features/build/shared/types";
import { parseViewType, type ViewType } from "./view-switcher";
import { INITIAL_FILTERS, type FilterState as WorkloadFilterState } from "./workload-types";
import type { KanbanTicket } from "@/features/build/shared/types";
import { mapBoardTicketToKanban } from "@/features/build/my-tickets/map-board-ticket";
import {
  boardCollectionSearchParams,
  buildTicketCollectionReturnHref,
} from "@/features/build/ticket-details/build-ticket-detail-url";
import { currentSearchParams } from "@/lib/current-search-params";
import { BUILD_LIST_CURSOR_PARAM } from "../shared/use-build-list-url-state";
import { useBoardNavigationActions } from "./use-board-navigation-actions";
import { useBoardFilterParams } from "./board-filter-params";
import {
  parseCreateCycleParam,
  filterBoardTickets,
  computeBoardMembers,
  computeWipLimits,
  computeDoneCount,
} from "./board-filter-model";
import { useBoardViewApply } from "./use-board-view-apply";

export function useBoardUrlState(
  projectId: number,
  defaultView: ViewType = "board",
) {
  const rawSearchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useMemo(
    () => boardCollectionSearchParams(projectId, pathname, rawSearchParams),
    [projectId, pathname, rawSearchParams],
  );

  const viewParam = searchParams.get("view");
  const calendarHref = `/calendar?source=build&projectId=${projectId}`;
  const isCalendarDeepLink =
    pathname === `/build/${projectId}/issues` && viewParam === "calendar";
  const view: ViewType =
    isCalendarDeepLink ? "board" : parseViewType(viewParam ?? defaultView);
  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;
  const commentParam = searchParams.get("comment");
  const highlightCommentId = commentParam ? parseInt(commentParam) : null;
  const viewId = searchParams.get("viewId");
  const createParamOpen = searchParams.get("create") === "1";
  const createCycleParam = searchParams.get("cycleId");
  const createDefaultCycleId = parseCreateCycleParam(createCycleParam);

  const {
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
  } = useBoardFilterParams();

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
      if (
        params.get("orderBy") !== searchParams.get("orderBy") ||
        params.get("orderDir") !== searchParams.get("orderDir")
      ) {
        params.delete(BUILD_LIST_CURSOR_PARAM);
      }
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

  useBoardViewApply({
    viewId,
    views,
    isCalendarDeepLink,
    calendarHref,
    searchParams,
    router,
    setStoredDisplayOptions,
  });

  const activeView = viewId
    ? views?.data.find((v) => v.id.toString() === viewId)
    : null;

  const allTickets: KanbanTicket[] = useMemo(() => {
    if (!boardTickets) return [];
    return boardTickets.map(mapBoardTicketToKanban);
  }, [boardTickets]);

  const statuses =
    data && "statuses" in data ? data.statuses : undefined;

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

  const filteredTickets = useMemo(
    () => filterBoardTickets({
      allTickets,
      hideCompleted,
      completedIssues: displayOptions.completedIssues,
      statuses,
      qaMatchIds,
    }),
    [allTickets, hideCompleted, displayOptions.completedIssues, statuses, qaMatchIds],
  );

  const members = useMemo(() => computeBoardMembers(data?.members), [data?.members]);
  const wipLimits = useMemo(() => computeWipLimits(statuses), [statuses]);
  const doneCount = useMemo(() => computeDoneCount(allTickets, statuses), [allTickets, statuses]);

  const showEmptyFilterState =
    !ticketsLoading &&
    !qaMatchesLoading &&
    hasActiveFilters &&
    filteredTickets.length === 0;

  const showFirstRunState =
    !ticketsLoading &&
    !hasActiveFilters &&
    allTickets.length === 0;

  const ticketCollectionReturnHref = useMemo(() => {
    const collectionPath =
      pathname === `/build/${projectId}/workload`
        ? pathname
        : `/build/${projectId}/issues`;
    return buildTicketCollectionReturnHref(projectId, collectionPath, searchParams);
  }, [projectId, pathname, searchParams]);

  const handleClearView = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("viewId");
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

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

  const {
    handleViewChange,
    handleWorkloadFilterChange,
    handleClearWorkloadFilters,
    handleTicketSelect,
    handleClearSearch,
    handleQaFilterChange,
    handleCreateOpenChange,
    handleSelectionChange,
    handleClearSelection,
  } = useBoardNavigationActions({
    projectId,
    pathname,
    searchParams,
    projectKey: data?.key,
    projectLoaded: !!data,
    selectedTicketId,
    highlightCommentId,
    allTickets,
    ticketCollectionReturnHref,
    setSelectedIds,
    setWorkloadFilters,
  });

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
    sortOrderBy,
    sortOrderDir,
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
    showFirstRunState,
    hasActiveFilters,
    boardFilters,
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
