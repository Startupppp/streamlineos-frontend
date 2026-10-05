"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import { useTicketColumnCounts, type BoardFilters } from "@/hooks/api/build/ticket-queries";
import {
  type StatusEntry,
  buildColumns,
  applyColumnOrder,
  groupTicketsByStatus,
  formatStatusName,
} from "./kanban-board-utils";
import { filterHiddenCompletedTickets } from "../shared/completed-status";
import { getTicketRowKey } from "./kanban-swimlane";
import { useKanbanDrag } from "./use-kanban-drag";
import type { KanbanTicket, KanbanColumn, DisplayOptions } from "../shared/types";
import type { ListSelection } from "./list-view-shared";

interface UseKanbanBoardOptions {
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  statuses?: StatusEntry[];
  onTicketSelect?: (ticketId: number) => void;
  wipLimits?: Record<string, number>;
  displayOptions?: DisplayOptions;
  hideCompleted?: boolean;
  hasActiveFilters?: boolean;
  filters?: BoardFilters;
  selection?: ListSelection;
}

export function useKanbanBoard({
  tickets,
  projectId,
  projectKey,
  statuses,
  onTicketSelect,
  wipLimits,
  displayOptions,
  hideCompleted = false,
  hasActiveFilters = false,
  filters,
  selection,
}: UseKanbanBoardOptions) {
  const canManage = useCan("build:manage");
  const canUpdateTickets = useCan("build:tickets:update");
  const { data: columnCountsData } = useTicketColumnCounts(projectId, filters);
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [optimisticStatuses, setOptimisticStatuses] = useState(statuses);
  const [optimisticColumnOrder, setOptimisticColumnOrder] = useState<KanbanColumn[] | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevTicketsRef = useRef(tickets);
  const prevStatusesRef = useRef(statuses);

  if (prevTicketsRef.current !== tickets) {
    prevTicketsRef.current = tickets;
    if (!isDraggingRef.current) setOptimisticTickets(tickets);
  }
  if (prevStatusesRef.current !== statuses) {
    prevStatusesRef.current = statuses;
    if (!isDraggingRef.current) {
      setOptimisticStatuses(statuses);
      setOptimisticColumnOrder(null);
    }
  }

  const rowBy = displayOptions?.rowBy ?? "none";
  const showEmptyColumns = displayOptions?.showEmptyColumns ?? true;
  const showEmptyRows = displayOptions?.showEmptyRows ?? false;

  const displayTickets = useMemo(
    () => filterHiddenCompletedTickets(optimisticTickets, hideCompleted, optimisticStatuses),
    [optimisticTickets, hideCompleted, optimisticStatuses],
  );

  const columns = useMemo<KanbanColumn[]>(() => {
    const built = buildColumns(
      optimisticStatuses,
      displayTickets.map((t) => t.status),
    );
    return applyColumnOrder(built);
  }, [optimisticStatuses, displayTickets]);

  const orderedColumns = optimisticColumnOrder ?? columns;

  const swimlaneRows = useMemo<string[]>(() => {
    if (rowBy === "none") return [];
    return [...new Set(displayTickets.map((t) => getTicketRowKey(t, rowBy)))];
  }, [displayTickets, rowBy]);

  const ticketsByStatus = useMemo(
    () => groupTicketsByStatus(displayTickets),
    [displayTickets],
  );

  const visibleColumns = useMemo<KanbanColumn[]>(() => {
    if (showEmptyColumns) return orderedColumns;
    if (rowBy === "none") {
      return orderedColumns.filter(
        (col) => (ticketsByStatus.get(col.id)?.length ?? 0) > 0,
      );
    }
    return orderedColumns.filter((col) =>
      swimlaneRows.some((rowKey) =>
        displayTickets.some(
          (t) => t.status === col.id && getTicketRowKey(t, rowBy) === rowKey,
        ),
      ),
    );
  }, [orderedColumns, showEmptyColumns, rowBy, displayTickets, swimlaneRows, ticketsByStatus]);

  const existingNames = useMemo(
    () => (optimisticStatuses ?? []).map((s) => s.name),
    [optimisticStatuses],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { onDragStart, onDragEnd } = useKanbanDrag({
    projectId,
    statuses,
    rowBy,
    hideCompleted,
    canManage,
    visibleColumns,
    orderedColumns,
    optimisticTickets,
    optimisticStatuses,
    setOptimisticTickets,
    setOptimisticStatuses,
    setOptimisticColumnOrder,
    isDraggingRef,
    dragStartRef,
  });

  const handleSelect = useCallback(
    (id: number) => {
      onTicketSelect?.(id);
    },
    [onTicketSelect],
  );

  const handleColumnRename = useCallback((oldName: string, newName: string) => {
    setOptimisticStatuses((prev) =>
      prev?.map((s) => (s.name === oldName ? { ...s, name: newName } : s)),
    );
    setOptimisticTickets((prev) =>
      prev.map((t) => (t.status === oldName ? { ...t, status: newName } : t)),
    );
    setOptimisticColumnOrder((prev) =>
      prev?.map((col) =>
        col.id === oldName
          ? { ...col, id: newName, name: formatStatusName(newName) }
          : col,
      ) ?? null,
    );
  }, []);

  const handleColumnColorChange = useCallback(
    (statusId: number, color: string) => {
      setOptimisticStatuses((prev) =>
        prev?.map((s) => (s.id === statusId ? { ...s, color } : s)),
      );
      setOptimisticColumnOrder((prev) =>
        prev?.map((col) =>
          col.statusId === statusId ? { ...col, color } : col,
        ) ?? null,
      );
    },
    [],
  );

  return {
    canManage,
    canUpdateTickets,
    columnCountsData,
    isMounted,
    optimisticStatuses,
    dragStartRef,
    rowBy,
    showEmptyRows,
    displayTickets,
    orderedColumns,
    swimlaneRows,
    ticketsByStatus,
    visibleColumns,
    existingNames,
    handleSelect,
    handleColumnRename,
    handleColumnColorChange,
    onDragStart,
    onDragEnd,
    hideCompleted,
    hasActiveFilters,
    wipLimits,
    displayOptions,
    projectId,
    projectKey,
    selection,
  };
}
