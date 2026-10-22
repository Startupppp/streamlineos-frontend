"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useHydrated } from "@/hooks/common/use-hydrated";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { useCan } from "@/hooks/api/access";
import { useTicketColumnCounts } from "@/hooks/api/build/ticket-queries";
import type { BoardFilters } from "@/hooks/api/build/ticket-queries-read-options";
import {
  type StatusEntry,
  buildColumns,
  applyColumnOrder,
  compareByRank,
  groupTicketsByKey,
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

  const columnBy = displayOptions?.columnBy ?? "status";
  const rowBy = displayOptions?.rowBy ?? "none";
  const ticketComparator =
    displayOptions?.orderBy == null || displayOptions.orderBy === "manual"
      ? compareByRank
      : null;
  const showEmptyColumns = displayOptions?.showEmptyColumns ?? true;
  const showEmptyRows = displayOptions?.showEmptyRows ?? false;

  const displayTickets = useMemo(
    () => filterHiddenCompletedTickets(optimisticTickets, hideCompleted, optimisticStatuses),
    [optimisticTickets, hideCompleted, optimisticStatuses],
  );

  const columns = useMemo<KanbanColumn[]>(() => {
    if (columnBy === "status") {
      const built = buildColumns(
        optimisticStatuses,
        displayTickets.map((t) => t.status),
      );
      return applyColumnOrder(built);
    }
    const seen = new Set<string>();
    const keys: string[] = [];
    for (const t of displayTickets) {
      const key = getTicketRowKey(t, columnBy);
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
    return keys.map((key, i) => ({ id: key, name: key, color: null, order: i }));
  }, [columnBy, optimisticStatuses, displayTickets]);

  const orderedColumns = columnBy === "status" ? (optimisticColumnOrder ?? columns) : columns;

  const swimlaneRows = useMemo<string[]>(() => {
    if (rowBy === "none") return [];
    return [...new Set(displayTickets.map((t) => getTicketRowKey(t, rowBy)))];
  }, [displayTickets, rowBy]);

  const swimlaneGroups = useMemo(
    () =>
      swimlaneRows
        .map((rowKey) => {
          const rowTickets = displayTickets.filter((t) => getTicketRowKey(t, rowBy) === rowKey);
          return {
            rowKey,
            tickets: rowTickets,
            byColumn: groupTicketsByKey(rowTickets, (t) => getTicketRowKey(t, columnBy), ticketComparator),
          };
        })
        .filter((group) => showEmptyRows || group.tickets.length > 0),
    [swimlaneRows, displayTickets, rowBy, columnBy, showEmptyRows, ticketComparator],
  );

  const visibleSwimlaneRows = useMemo(
    () => swimlaneGroups.map((group) => group.rowKey),
    [swimlaneGroups],
  );

  const ticketsByColumn = useMemo(
    () => groupTicketsByKey(displayTickets, (t) => getTicketRowKey(t, columnBy), ticketComparator),
    [displayTickets, columnBy, ticketComparator],
  );

  const visibleColumns = useMemo<KanbanColumn[]>(() => {
    if (showEmptyColumns) return orderedColumns;
    if (rowBy === "none") {
      return orderedColumns.filter(
        (col) => (ticketsByColumn.get(col.id)?.length ?? 0) > 0,
      );
    }
    return orderedColumns.filter((col) =>
      swimlaneRows.some((rowKey) =>
        displayTickets.some(
          (t) => getTicketRowKey(t, columnBy) === col.id && getTicketRowKey(t, rowBy) === rowKey,
        ),
      ),
    );
  }, [orderedColumns, showEmptyColumns, rowBy, columnBy, displayTickets, swimlaneRows, ticketsByColumn]);

  const existingNames = useMemo(
    () => (optimisticStatuses ?? []).map((s) => s.name),
    [optimisticStatuses],
  );

  const { onDragStart, onDragEnd } = useKanbanDrag({
    projectId,
    statuses,
    columnBy,
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
    columnBy,
    rowBy,
    swimlaneGroups,
    visibleSwimlaneRows,
    ticketsByColumn,
    visibleColumns,
    existingNames,
    handleSelect,
    handleColumnRename,
    handleColumnColorChange,
    onDragStart,
    onDragEnd,
  };
}
