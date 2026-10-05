"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useHydrated } from "@/hooks/common/use-hydrated";
import { useSourceOverride } from "@/hooks/common/use-source-override";
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

interface UseKanbanBoardOptions {
  tickets: KanbanTicket[];
  projectId: number;
  statuses?: StatusEntry[];
  onTicketSelect?: (ticketId: number) => void;
  displayOptions?: DisplayOptions;
  hideCompleted?: boolean;
  filters?: BoardFilters;
}

export function useKanbanBoard({
  tickets,
  projectId,
  statuses,
  onTicketSelect,
  displayOptions,
  hideCompleted = false,
  filters,
}: UseKanbanBoardOptions) {
  const canManage = useCan("build:manage");
  const canUpdateTickets = useCan("build:tickets:update");
  const { data: columnCountsData } = useTicketColumnCounts(projectId, filters);
  const isMounted = useHydrated();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [optimisticTickets, setOptimisticTickets] = useSourceOverride(tickets, tickets, isDragging);
  const [optimisticStatuses, setOptimisticStatuses] = useSourceOverride(statuses, statuses, isDragging);
  const [optimisticColumnOrder, setOptimisticColumnOrder] = useSourceOverride<
    StatusEntry[] | undefined,
    KanbanColumn[] | null
  >(statuses, null, isDragging);

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

  const swimlaneGroups = useMemo(
    () =>
      swimlaneRows
        .map((rowKey) => {
          const rowTickets = displayTickets.filter((t) => getTicketRowKey(t, rowBy) === rowKey);
          return { rowKey, tickets: rowTickets, byStatus: groupTicketsByStatus(rowTickets) };
        })
        .filter((group) => showEmptyRows || group.tickets.length > 0),
    [swimlaneRows, displayTickets, rowBy, showEmptyRows],
  );

  const visibleSwimlaneRows = useMemo(
    () => swimlaneGroups.map((group) => group.rowKey),
    [swimlaneGroups],
  );

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
    setIsDragging,
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
  }, [setOptimisticStatuses, setOptimisticTickets, setOptimisticColumnOrder]);

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
    [setOptimisticStatuses, setOptimisticColumnOrder],
  );

  return {
    canManage,
    canUpdateTickets,
    columnCountsData,
    isMounted,
    optimisticStatuses,
    dragStartRef,
    rowBy,
    swimlaneGroups,
    visibleSwimlaneRows,
    ticketsByStatus,
    visibleColumns,
    existingNames,
    handleSelect,
    handleColumnRename,
    handleColumnColorChange,
    onDragStart,
    onDragEnd,
  };
}
