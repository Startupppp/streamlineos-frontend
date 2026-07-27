"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUpdateTicketOrder, useReorderCustomStates } from "@/hooks/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  filterHiddenCompletedTickets,
  isCompletedTicketStatus,
} from "../shared/completed-status";
import { useCan } from "@/hooks/api/access";

type UpdateOrderContext = {
  previous: KanbanTicket[];
  previousCache: KanbanTicket[] | undefined;
};

const COLUMN_DND_TYPE = "COLUMN";

function isUpdateOrderContext(v: unknown): v is UpdateOrderContext {
  return typeof v === "object" && v !== null && "previous" in v;
}

function columnDraggableId(col: KanbanColumn): string {
  return `column-${col.statusId ?? col.id}`;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "TODO", name: "To Do", color: "#94a3b8", order: 0 },
  { id: "IN_PROGRESS", name: "In Progress", color: "#3b82f6", order: 1 },
  { id: "IN_REVIEW", name: "In Review", color: "#eab308", order: 2 },
  { id: "DONE", name: "Done", color: "#22c55e", order: 3 },
];

interface KanbanBoardProps {
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  statuses?: Array<{
    id: number;
    name: string;
    color: string | null;
    order: number;
    wipLimit?: number | null;
    type?: string | null;
  }>;
  onTicketSelect?: (ticketId: number) => void;
  wipLimits?: Record<string, number>;
  displayOptions?: DisplayOptions;
  hideCompleted?: boolean;
}

function encodeRowKey(key: string): string {
  return key.replace(/\|/g, "__PIPE__");
}

function decodeRowKey(key: string): string {
  return key.replace(/__PIPE__/g, "|");
}

function formatStatusName(name: string): string {
  return name.replace(/_/g, " ");
}

function buildColumns(
  statusList: KanbanBoardProps["statuses"],
  ticketStatuses: string[],
): KanbanColumn[] {
  if (!statusList || statusList.length === 0) return DEFAULT_COLUMNS;
  const configured = statusList.map((s) => ({
    id: s.name,
    statusId: s.id,
    name: formatStatusName(s.name),
    color: s.color,
    order: s.order,
  }));
  const configuredIds = new Set(configured.map((c) => c.id));
  const orphanStatuses = [...new Set(ticketStatuses)].filter((s) => !configuredIds.has(s));
  if (orphanStatuses.length === 0) return configured;
  return [
    ...configured,
    ...orphanStatuses.map((s, i) => ({
      id: s,
      name: formatStatusName(s),
      color: null as string | null,
      order: configured.length + i,
    })),
  ];
}

function applyColumnOrder(items: KanbanColumn[]): KanbanColumn[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function groupTicketsByStatus(tickets: KanbanTicket[]): Map<string, KanbanTicket[]> {
  const map = new Map<string, KanbanTicket[]>();
  for (const ticket of tickets) {
    const list = map.get(ticket.status);
    if (list) list.push(ticket);
    else map.set(ticket.status, [ticket]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return map;
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
}: KanbanBoardProps) {
  const canManage = useCan("build:manage");
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [optimisticStatuses, setOptimisticStatuses] = useState(statuses);
  const [optimisticColumnOrder, setOptimisticColumnOrder] = useState<KanbanColumn[] | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const prevTicketsRef = useRef(tickets);
  const prevStatusesRef = useRef(statuses);
  const queryClient = useQueryClient();
  const boardTicketsKey = queryKeys.projects.tickets({ projectId, view: "board" });

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
      return orderedColumns.filter((col) => (ticketsByStatus.get(col.id)?.length ?? 0) > 0);
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

  const reorderStates = useReorderCustomStates(projectId);

  const updateOrder = useUpdateTicketOrder({
    onMutate: async (variables): Promise<UpdateOrderContext> => {
      await queryClient.cancelQueries({ queryKey: boardTicketsKey });
      const previousCache = queryClient.getQueryData<KanbanTicket[]>(boardTicketsKey);
      const byId = new Map(variables.items.map((item) => [item.id, item]));
      queryClient.setQueryData<KanbanTicket[]>(boardTicketsKey, (old) => {
        if (!old) return old;
        return old.map((ticket) => {
          const next = byId.get(ticket.id);
          return next
            ? { ...ticket, status: next.status, order: next.order }
            : ticket;
        });
      });
      return { previous: optimisticTickets, previousCache };
    },
    onError: (error, __, context) => {
      if (isUpdateOrderContext(context)) {
        setOptimisticTickets(context.previous);
        queryClient.setQueryData(boardTicketsKey, context.previousCache);
      }
      toast.error(getErrorMessage(error));
    },
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
        col.id === oldName ? { ...col, id: newName, name: formatStatusName(newName) } : col,
      ) ?? null,
    );
  }, []);

  const handleColumnColorChange = useCallback((statusId: number, color: string) => {
    setOptimisticStatuses((prev) =>
      prev?.map((s) => (s.id === statusId ? { ...s, color } : s)),
    );
    setOptimisticColumnOrder((prev) =>
      prev?.map((col) => (col.statusId === statusId ? { ...col, color } : col)) ?? null,
    );
  }, []);

  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
    dragStartRef.current = null;
  }, []);

  const handleColumnDragEnd = useCallback(
    (result: DropResult) => {
      if (!canManage) return;
      const { destination, source } = result;
      if (!destination) return;
      if (destination.index === source.index) return;

      const reorderedVisible = Array.from(visibleColumns);
      const [moved] = reorderedVisible.splice(source.index, 1);
      if (!moved?.statusId) return;
      reorderedVisible.splice(destination.index, 0, moved);

      const visibleIds = new Set(reorderedVisible.map((col) => col.id));
      const hiddenColumns = orderedColumns.filter((col) => !visibleIds.has(col.id));
      const mergedOrder = [...reorderedVisible, ...hiddenColumns];

      let configuredOrder = 0;
      const nextColumnOrder = mergedOrder.map((col) => {
        if (col.statusId == null) return col;
        const next = { ...col, order: configuredOrder };
        configuredOrder += 1;
        return next;
      });

      setOptimisticColumnOrder(nextColumnOrder);
      setOptimisticStatuses((prev) =>
        prev?.map((status) => {
          const next = nextColumnOrder.find((col) => col.statusId === status.id);
          return next ? { ...status, order: next.order } : status;
        }),
      );

      reorderStates.mutate(
        nextColumnOrder.flatMap((col) =>
          col.statusId != null
            ? [{ stateId: col.statusId, order: col.order }]
            : [],
        ),
        {
          onError: (error) => {
            setOptimisticColumnOrder(null);
            setOptimisticStatuses(statuses);
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [
      canManage,
      visibleColumns,
      orderedColumns,
      reorderStates,
      statuses,
    ],
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      if (result.type === COLUMN_DND_TYPE) {
        handleColumnDragEnd(result);
        return;
      }

      const { destination, source, draggableId } = result;
      if (!destination) return;

      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      if (rowBy !== "none") {
        const srcRow = decodeRowKey(source.droppableId.split("||")[0] ?? "");
        const dstRow = decodeRowKey(destination.droppableId.split("||")[0] ?? "");
        if (srcRow !== dstRow) {
          toast.error("Cannot move across rows — reassign the ticket directly.");
          return;
        }
      }

      const ticketId = Number.parseInt(draggableId, 10);
      if (!Number.isFinite(ticketId)) return;

      const newStatus = rowBy !== "none"
        ? destination.droppableId.split("||")[1] ?? destination.droppableId
        : destination.droppableId;

      if (hideCompleted && isCompletedTicketStatus(newStatus, optimisticStatuses)) {
        toast.error("Turn off Hide done to move tickets into a completed column.");
        return;
      }

      const srcColId = rowBy !== "none"
        ? source.droppableId.split("||")[1] ?? source.droppableId
        : source.droppableId;

      const sourceTicket = optimisticTickets.find((t) => t.id === ticketId);
      if (!sourceTicket) return;

      const newTickets = [...optimisticTickets];
      const movedTicket = { ...sourceTicket, status: newStatus };

      const sourceTickets = newTickets
        .filter((t) => t.status === srcColId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const destTickets =
        srcColId === newStatus
          ? sourceTickets
          : newTickets
              .filter((t) => t.status === newStatus)
              .sort((a, b) => (a.order || 0) - (b.order || 0));

      const updates: { id: number; status: string; order: number }[] = [];

      if (srcColId === newStatus) {
        const items = Array.from(sourceTickets);
        const [reorderedItem] = items.splice(source.index, 1);
        if (!reorderedItem) return;
        items.splice(destination.index, 0, reorderedItem);
        items.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
          if (tIndex === -1) return;
          newTickets[tIndex] = { ...newTickets[tIndex], order: index };
          updates.push({ id: ticket.id, status: ticket.status, order: index });
        });
      } else {
        const sourceItems = Array.from(sourceTickets);
        sourceItems.splice(source.index, 1);
        const destItems = Array.from(destTickets);
        destItems.splice(destination.index, 0, movedTicket);
        destItems.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
          if (tIndex === -1) return;
          newTickets[tIndex] = {
            ...newTickets[tIndex],
            status: newStatus,
            order: index,
          };
          updates.push({ id: ticket.id, status: newStatus, order: index });
        });
        sourceItems.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
          if (tIndex === -1) return;
          newTickets[tIndex] = { ...newTickets[tIndex], order: index };
          updates.push({
            id: ticket.id,
            status: ticket.status,
            order: index,
          });
        });
      }

      setOptimisticTickets(newTickets);
      updateOrder.mutate({ projectId, items: updates });
    },
    [
      optimisticTickets,
      updateOrder,
      projectId,
      rowBy,
      hideCompleted,
      optimisticStatuses,
      handleColumnDragEnd,
    ],
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
              <AccordionItem key={rowKey} value={rowKey} className="min-w-0 border-b-0">
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
                        displayOptions={displayOptions}
                        minHeightClass="min-h-[60px]"
                        stretch
                        onRename={handleColumnRename}
                        onColorChange={handleColumnColorChange}
                        onSelect={handleSelect}
                        dragStartRef={dragStartRef}
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
        type={COLUMN_DND_TYPE}
      >
        {(columnsProvided) => (
          <div
            ref={columnsProvided.innerRef}
            {...columnsProvided.droppableProps}
            className="kanban-scroll-container scrollbar-hide flex h-full min-w-0 items-start gap-3 overflow-x-auto pb-1 px-1"
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
                      displayOptions={displayOptions}
                      showQuickAdd
                      showHeaderQuickAdd
                      dragHandleProps={
                        canReorderColumn ? columnProvided.dragHandleProps : null
                      }
                      isColumnDragging={columnSnapshot.isDragging}
                      onRename={handleColumnRename}
                      onColorChange={handleColumnColorChange}
                      onSelect={handleSelect}
                      dragStartRef={dragStartRef}
                      columnInnerRef={columnProvided.innerRef}
                      columnDraggableProps={columnProvided.draggableProps}
                    />
                  )}
                </Draggable>
              );
            })}
            {columnsProvided.placeholder}
            <AddColumn
              projectId={projectId}
              existingNames={existingNames}
            />
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
