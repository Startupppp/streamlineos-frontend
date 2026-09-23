"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { AddColumn } from "./kanban-add-column";
import { KanbanBoardColumn } from "./kanban-board-column";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SwimlaneRowHeader, getTicketRowKey } from "./kanban-swimlane";
import type { KanbanTicket, KanbanColumn, DisplayOptions } from "../shared/types";
import type { ListSelection } from "./list-view-shared";
import {
  filterHiddenCompletedTickets,
} from "../shared/completed-status";
import { useCan } from "@/hooks/api/access";
import {
  type StatusEntry,
  columnDraggableId,
  encodeRowKey,
  buildColumns,
  applyColumnOrder,
  groupTicketsByStatus,
  formatStatusName,
  BOARD_COLUMN_VIRTUALIZATION_THRESHOLD,
} from "./kanban-board-utils";
import { useKanbanDrag } from "./use-kanban-drag";
import { useTicketColumnCounts } from "@/hooks/api/build/ticket-queries";

interface KanbanBoardProps {
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  statuses?: StatusEntry[];
  onTicketSelect?: (ticketId: number) => void;
  wipLimits?: Record<string, number>;
  displayOptions?: DisplayOptions;
  hideCompleted?: boolean;
  hasActiveFilters?: boolean;
  selection?: ListSelection;
}

export function KanbanBoard({
  tickets,
  projectId,
  projectKey,
  statuses,
  onTicketSelect,
  wipLimits,
  displayOptions,
  hideCompleted = false,
  hasActiveFilters = false,
  selection,
}: KanbanBoardProps) {
  const canManage = useCan("build:manage");
  const canUpdateTickets = useCan("build:tickets:update");
  const { data: columnCountsData } = useTicketColumnCounts(
    hasActiveFilters ? 0 : projectId,
  );
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

  if (!isMounted) return null;

  if (rowBy !== "none") {
    const visibleSwimlaneRows = swimlaneRows.filter((rowKey) => {
      if (showEmptyRows) return true;
      return displayTickets.some((t) => getTicketRowKey(t, rowBy) === rowKey);
    });

    return (
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <Accordion
          type="multiple"
          defaultValue={visibleSwimlaneRows}
          className="flex h-full min-w-0 flex-col gap-1.5 overflow-y-auto pb-1 px-1 scrollbar-hide"
        >
          {visibleSwimlaneRows.map((rowKey) => {
            const rowTickets = displayTickets.filter(
              (t) => getTicketRowKey(t, rowBy) === rowKey,
            );
            const rowByStatus = groupTicketsByStatus(rowTickets);

            return (
              <AccordionItem
                key={rowKey}
                value={rowKey}
                className="min-w-0 border-b-0"
              >
                <AccordionTrigger className="flex items-center gap-2 px-1 py-1 font-normal hover:no-underline [&>svg]:ml-auto">
                  <div className="flex items-center gap-2">
                    <SwimlaneRowHeader
                      rowKey={rowKey}
                      rowBy={rowBy}
                      tickets={rowTickets}
                      count={rowTickets.length}
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="kanban-scroll-container scrollbar-hide flex h-[min(480px,calc(100dvh-12rem))] max-h-[min(480px,calc(100dvh-12rem))] items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-2 pt-0.5">
                    {visibleColumns.map((col) => (
                      <KanbanBoardColumn
                        key={col.id}
                        column={col}
                        tickets={rowByStatus.get(col.id) ?? []}
                        projectId={projectId}
                        projectKey={projectKey}
                        droppableId={`${encodeRowKey(rowKey)}||${col.id}`}
                        canManage={canManage}
                        existingNames={existingNames}
                        wipLimit={wipLimits?.[col.id]}
                        serverCount={hasActiveFilters ? undefined : columnCountsData?.[col.id]}
                        displayOptions={displayOptions}
                        minHeightClass="min-h-[60px]"
                        stretch
                        onRename={handleColumnRename}
                        onColorChange={handleColumnColorChange}
                        onSelect={handleSelect}
                        selection={selection}
                        dragStartRef={dragStartRef}
                        canDragTickets={canUpdateTickets}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </DragDropContext>
    );
  }

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <Droppable
        droppableId="board-columns"
        direction="horizontal"
        type="COLUMN"
      >
        {(columnsProvided) => (
          <div
            ref={columnsProvided.innerRef}
            {...columnsProvided.droppableProps}
            className={cn(
              "kanban-scroll-container scrollbar-hide flex h-full min-w-0 items-start gap-3 overflow-x-auto pb-1 px-1",
              visibleColumns.length > BOARD_COLUMN_VIRTUALIZATION_THRESHOLD && "[&>*]:content-visibility-auto",
            )}
          >
            {visibleColumns.map((col, index) => {
              const columnTickets = ticketsByStatus.get(col.id) ?? [];
              const canReorderColumn = canManage && col.statusId != null;

              return (
                <Draggable
                  key={col.id}
                  draggableId={columnDraggableId(col)}
                  index={index}
                  isDragDisabled={!canReorderColumn}
                >
                  {(columnProvided, columnSnapshot) => (
                    <KanbanBoardColumn
                      column={col}
                      tickets={columnTickets}
                      projectId={projectId}
                      projectKey={projectKey}
                      droppableId={col.id}
                      canManage={canManage}
                      existingNames={existingNames}
                      wipLimit={wipLimits?.[col.id]}
                      serverCount={hasActiveFilters ? undefined : columnCountsData?.[col.id]}
                      displayOptions={displayOptions}
                      showHeaderQuickAdd
                      dragHandleProps={
                        canReorderColumn ? columnProvided.dragHandleProps : null
                      }
                      isColumnDragging={columnSnapshot.isDragging}
                      onRename={handleColumnRename}
                      onColorChange={handleColumnColorChange}
                      onSelect={handleSelect}
                        selection={selection}
                      dragStartRef={dragStartRef}
                      canDragTickets={canUpdateTickets}
                      columnInnerRef={columnProvided.innerRef}
                      columnDraggableProps={columnProvided.draggableProps}
                    />
                  )}
                </Draggable>
              );
            })}
            {columnsProvided.placeholder}
            <AddColumn projectId={projectId} existingNames={existingNames} />
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
