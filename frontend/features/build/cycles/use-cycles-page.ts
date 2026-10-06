"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  useBulkUpdateTickets,
  useProjectBoardTickets,
} from "@/hooks/api/build/tickets";
import {
  useCyclePage,
  useDeleteCycle,
  useUpdateCycle,
  type CycleListFilters,
} from "@/hooks/api/build/cycles";
import { useProject } from "@/hooks/api/build/projects";
import { isCompletedTicketStatus } from "@/features/build/shared/completed-status";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Cycle } from "@/types/projects";
import { nextCycleStatus, statusActionLabel } from "./cycles-model";

const CYCLE_PAGE_SIZE = 25;

const CYCLE_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "draft", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

const CYCLE_FILTER_DEFINITIONS = [
  { param: "status", options: CYCLE_STATUS_OPTIONS.map((o) => o.value) },
  { param: "from" },
  { param: "to" },
] as const;

export { CYCLE_STATUS_OPTIONS };

export function useCyclesPage(projectId: number) {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Cycle | null>(null);
  const [statusTarget, setStatusTarget] = useState<Cycle | null>(null);
  const [planningTarget, setPlanningTarget] = useState<Cycle | null>(null);
  const [completionTarget, setCompletionTarget] = useState<Cycle | null>(null);
  const [completionMoveTo, setCompletionMoveTo] = useState<"backlog" | "next">("backlog");
  const [deleteTarget, setDeleteTarget] = useState<Cycle | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const canManage = useCan("build:cycles:manage");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listFilters = useBuildListFilters({ filters: CYCLE_FILTER_DEFINITIONS });
  const isOnline = useOnlineStatus();

  const statusFilterValue = listFilters.value("status");
  const fromFilterValue = listFilters.value("from");
  const toFilterValue = listFilters.value("to");
  const dateFilterFrom = fromFilterValue !== BUILD_FILTER_ALL ? fromFilterValue : undefined;
  const dateFilterTo = toFilterValue !== BUILD_FILTER_ALL ? toFilterValue : undefined;
  const resolvedCycleStatus =
    statusFilterValue !== BUILD_FILTER_ALL &&
    (statusFilterValue === "draft" || statusFilterValue === "active" || statusFilterValue === "completed")
      ? statusFilterValue
      : undefined;
  const cycleFilters: CycleListFilters = {
    status: resolvedCycleStatus,
    q: listFilters.debouncedSearch || undefined,
    from: dateFilterFrom,
    to: dateFilterTo,
    cursor: listFilters.cursor ?? undefined,
    limit: CYCLE_PAGE_SIZE,
  };
  const { error, refetch, isError, isLoading, dataUpdatedAt, data: cyclePage } = useCyclePage(projectId, cycleFilters);
  const cycles = cyclePage?.data;
  const hasMoreCycles = cyclePage?.pagination.hasMore ?? false;
  const nextCycleCursor = cyclePage?.pagination.nextCursor ?? null;
  const [visitedCursors, setVisitedCursors] = useState<(string | null)[]>([]);
  const urlCursor = listFilters.cursor;

  const handleNextPage = useCallback(() => {
    if (!nextCycleCursor) return;
    setVisitedCursors((current) => [...current, urlCursor]);
    listFilters.setCursor(nextCycleCursor);
  }, [listFilters, nextCycleCursor, urlCursor]);

  const handlePreviousPage = useCallback(() => {
    const previous = visitedCursors[visitedCursors.length - 1] ?? null;
    setVisitedCursors((current) => current.slice(0, -1));
    listFilters.setCursor(previous);
  }, [listFilters, visitedCursors]);

  const { data: ticketsData } = useProjectBoardTickets(projectId);
  const tickets = useMemo(() => ticketsData ?? [], [ticketsData]);
  const { data: projectData } = useProject(projectId);
  const projectStatuses = useMemo(() => projectData?.statuses ?? [], [projectData]);
  const updateCycle = useUpdateCycle();
  const bulkUpdateTickets = useBulkUpdateTickets(projectId);
  const deleteCycle = useDeleteCycle();
  const pageState = usePageState({ error, isError, isLoading, permission: "build:cycles:view" });

  const activeCycles = useMemo(() => (cycles ?? []).filter((c) => c.status === "active"), [cycles]);
  const upcomingCycles = useMemo(() => (cycles ?? []).filter((c) => c.status === "draft"), [cycles]);
  const completedCycles = useMemo(() => (cycles ?? []).filter((c) => c.status === "completed"), [cycles]);
  const displayedCycles = useMemo(
    () => [...activeCycles, ...upcomingCycles, ...completedCycles],
    [activeCycles, upcomingCycles, completedCycles],
  );

  const handleOpenCreate = useCallback(() => { setEditTarget(null); setFormOpen(true); }, []);
  const handleEditByIndex = useCallback((index: number) => {
    const cycle = displayedCycles[index];
    if (!cycle) return;
    setEditTarget(cycle);
    setFormOpen(true);
  }, [displayedCycles]);
  const handleNoSelection = useCallback(() => {}, []);
  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);
  const handleStatusFilterChange = useCallback((value: string) => {
    setVisitedCursors([]);
    listFilters.setValue("status", value);
  }, [listFilters]);
  const handleDateRangeChange = useCallback((range: { from: string; to: string }) => {
    setVisitedCursors([]);
    listFilters.setValue("from", range.from);
    listFilters.setValue("to", range.to);
  }, [listFilters]);

  useBuildListKeyboard({
    itemCount: displayedCycles.length,
    onOpen: handleEditByIndex,
    onEdit: handleEditByIndex,
    onCreate: canManage ? handleOpenCreate : undefined,
    onClearSelection: handleNoSelection,
    onShortcutHelp: handleShortcutHelp,
    enabled: pageState.kind === "ready",
    searchInputRef,
  });

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const completedParam = searchParams.get("completed");
  const showCompleted =
    completedParam === "1" || (completedParam !== "0" && resolvedCycleStatus === "completed");

  const handleToggleCompleted = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (!showCompleted) next.set("completed", "1");
    else if (resolvedCycleStatus === "completed") next.set("completed", "0");
    else next.delete("completed");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, showCompleted, resolvedCycleStatus]);

  const handleEdit = useCallback((cycle: Cycle) => { setEditTarget(cycle); setFormOpen(true); }, []);
  const handleFormOpenChange = useCallback((open: boolean) => { setFormOpen(open); if (!open) setEditTarget(null); }, []);

  const handleConfirmStatus = useCallback(() => {
    if (!statusTarget) return;
    const action = statusActionLabel(statusTarget.status);
    updateCycle.mutate(
      { projectId, cycleId: statusTarget.id, version: statusTarget.version, status: nextCycleStatus(statusTarget.status) },
      {
        onSuccess: () => { toast.success(`${action} cycle succeeded`); setStatusTarget(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [projectId, statusTarget, updateCycle]);

  const handleConfirmCompletion = useCallback(async (targetCycleId: number | null) => {
    if (!completionTarget) return;
    const incompleteTicketIds = tickets
      .filter((t) => t.cycleId === completionTarget.id && !isCompletedTicketStatus(t.status, projectStatuses))
      .map((t) => t.id);
    try {
      if (incompleteTicketIds.length > 0) {
        await bulkUpdateTickets.mutateAsync({ ticketIds: incompleteTicketIds, cycleId: targetCycleId });
      }
      updateCycle.mutate(
        { projectId, cycleId: completionTarget.id, version: completionTarget.version, status: "completed" },
        {
          onSuccess: () => { toast.success("Cycle completed"); setCompletionTarget(null); setCompletionMoveTo("backlog"); },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [bulkUpdateTickets, completionTarget, projectId, projectStatuses, tickets, updateCycle]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCycle.mutate(
      { projectId, cycleId: deleteTarget.id },
      {
        onSuccess: () => { toast.success("Cycle deleted"); setDeleteTarget(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteCycle, deleteTarget, projectId]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const { iconRef: completedChevronRef, hoverHandlers: completedChevronHoverHandlers } = useAnimatedIcon();

  return {
    pageState,
    isOnline,
    dataUpdatedAt,
    listFilters,
    searchInputRef,
    activeCycles,
    upcomingCycles,
    completedCycles,
    displayedCycles,
    hasCycles: displayedCycles.length > 0,
    hasMoreCycles,
    visitedCursors,
    canManage,
    cycles,
    tickets,
    projectStatuses,
    formOpen,
    editTarget,
    statusTarget,
    planningTarget,
    completionTarget,
    completionMoveTo,
    deleteTarget,
    shortcutHelpOpen,
    showCompleted,
    completedChevronRef,
    completedChevronHoverHandlers,
    dateFilterFrom,
    dateFilterTo,
    updateIsPending: updateCycle.isPending,
    bulkIsPending: bulkUpdateTickets.isPending,
    deleteIsPending: deleteCycle.isPending,
    handleOpenCreate,
    handleEdit,
    handleFormOpenChange,
    handleStatusFilterChange,
    handleDateRangeChange,
    handleToggleCompleted,
    handleRetry,
    handleConfirmStatus,
    handleConfirmCompletion,
    handleConfirmDelete,
    handleNextPage,
    handlePreviousPage,
    setStatusTarget,
    setPlanningTarget,
    setCompletionTarget,
    setCompletionMoveTo,
    setDeleteTarget,
    setShortcutHelpOpen,
  };
}
