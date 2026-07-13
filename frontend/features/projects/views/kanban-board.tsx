"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateTicketOrder, useReorderCustomStates } from "@/hooks/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { KanbanTicketCard } from "./kanban-ticket-card";
import { QuickAddInput } from "./kanban-quick-add";
import { AddColumn } from "./kanban-add-column";
import { KanbanColumnHeader } from "./kanban-column-header";
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
import { AnimatePresence, motion } from "framer-motion";
import { useCan } from "@/hooks/api/access";

type UpdateOrderContext = { previous: KanbanTicket[] };

const COLUMN_DND_TYPE = "COLUMN";
const TICKET_DND_TYPE = "TICKET";

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
  const canManage = useCan("projects:manage");
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [optimisticStatuses, setOptimisticStatuses] = useState(statuses);
  const [optimisticColumnOrder, setOptimisticColumnOrder] = useState<KanbanColumn[] | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevTicketsRef = useRef(tickets);
  const prevStatusesRef = useRef(statuses);
  if (prevTicketsRef.current !== tickets) {
    prevTicketsRef.current = tickets;
    setOptimisticTickets(tickets);
  }
  if (prevStatusesRef.current !== statuses) {
    prevStatusesRef.current = statuses;
    setOptimisticStatuses(statuses);
    setOptimisticColumnOrder(null);
  }
  const queryClient = useQueryClient();

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
    const keys = [...new Set(displayTickets.map((t) => getTicketRowKey(t, rowBy)))];
    return keys;
  }, [displayTickets, rowBy]);

  const visibleColumns = useMemo<KanbanColumn[]>(() => {
    if (showEmptyColumns) return orderedColumns;
    if (rowBy === "none") {
      return orderedColumns.filter((col) => displayTickets.some((t) => t.status === col.id));
    }
    return orderedColumns.filter((col) =>
      swimlaneRows.some((rowKey) =>
        displayTickets.some(
          (t) => t.status === col.id && getTicketRowKey(t, rowBy) === rowKey,
        ),
      ),
    );
  }, [orderedColumns, showEmptyColumns, rowBy, displayTickets, swimlaneRows]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const reorderStates = useReorderCustomStates(projectId);

  const updateOrder = useUpdateTicketOrder({
    onMutate: async (): Promise<UpdateOrderContext> => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      return { previous: optimisticTickets };
    },
    onError: (error, __, context) => {
      if (isUpdateOrderContext(context)) setOptimisticTickets(context.previous);
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.ticketActivity.all,
      });
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
        nextColumnOrder
          .filter((col) => col.statusId != null)
          .map((col) => ({
            stateId: col.statusId!,
            order: col.order,
          })),
        {
          onError: (error) => {
            setOptimisticColumnOrder(null);
            setOptimisticStatuses(statuses);
            toast.error(getErrorMessage(error));
          },
          onSettled: () => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.projects.detail(projectId),
            });
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
      queryClient,
      projectId,
    ],
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
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

      const ticketId = parseInt(draggableId);
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

      const newTickets = [...optimisticTickets];
      const movedTicket = {
        ...newTickets.find((t) => t.id === ticketId)!,
        status: newStatus,
      };

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
        items.splice(destination.index, 0, reorderedItem);
        items.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
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
          if (tIndex !== -1) {
            newTickets[tIndex] = {
              ...newTickets[tIndex],
              status: newStatus,
              order: index,
            };
            updates.push({ id: ticket.id, status: newStatus, order: index });
          }
        });
        sourceItems.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
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

  const renderColumnTickets = useCallback(
    (
      col: KanbanColumn,
      columnTickets: KanbanTicket[],
      droppableId: string,
      minHeight: string,
      stretchColumn: boolean,
    ) => (
      <Droppable droppableId={droppableId} type={TICKET_DND_TYPE}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              stretchColumn ? "flex-1" : "",
              "overflow-y-auto scrollbar-thin px-2 pb-2 space-y-1.5 transition-colors",
              minHeight,
              snapshot.isDraggingOver && "bg-primary/5",
            )}
          >
            <AnimatePresence mode="popLayout">
              {columnTickets.length === 0 && !snapshot.isDraggingOver && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "flex flex-col items-center justify-center text-center",
                    minHeight === "min-h-[60px]" ? "py-6" : "py-8",
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
                    <Plus className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Drop tickets here</p>
                </motion.div>
              )}
              {columnTickets.map((ticket, index) => (
                <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                  {(draggableProvided, draggableSnapshot) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      {...draggableProvided.dragHandleProps}
                      style={{ ...draggableProvided.draggableProps.style }}
                    >
                      <KanbanTicketCard
                        ticket={ticket}
                        projectId={projectId}
                        projectKey={projectKey}
                        isDragging={draggableSnapshot.isDragging}
                        dragStartRef={dragStartRef}
                        onSelect={handleSelect}
                        projectStatuses={optimisticStatuses}
                        displayOptions={displayOptions}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    ),
    [
      projectId,
      projectKey,
      handleSelect,
      optimisticStatuses,
      displayOptions,
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
          className="flex flex-col gap-1.5 h-full min-w-0 overflow-auto pb-1 px-1"
        >
          {visibleSwimlaneRows.map((rowKey) => {
            const rowTickets = displayTickets.filter(
              (t) => getTicketRowKey(t, rowBy) === rowKey,
            );

            return (
              <AccordionItem key={rowKey} value={rowKey} className="min-w-0 border-b-0">
                <AccordionTrigger className="flex items-center gap-2 px-1 py-1 hover:no-underline font-normal [&>svg]:ml-auto">
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
                  <div className="flex items-start gap-3 overflow-x-auto pb-2 pt-0.5">
                    {visibleColumns.map((col) => {
                      const droppableId = `${encodeRowKey(rowKey)}||${col.id}`;
                      const columnTickets = rowTickets
                        .filter((t) => t.status === col.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                      const wip = wipLimits?.[col.id];
                      const overWip = wip != null && columnTickets.length > wip;

                      return (
                        <div
                          key={col.id}
                          className={cn(
                            "w-72 min-w-[280px] shrink-0 rounded-lg border bg-muted/20 flex flex-col",
                            overWip && "border-destructive/60",
                          )}
                        >
                          <KanbanColumnHeader
                            column={col}
                            projectId={projectId}
                            ticketCount={columnTickets.length}
                            wipLimit={wip}
                            canManage={canManage}
                            existingNames={(optimisticStatuses ?? []).map((s) => s.name)}
                            onRename={handleColumnRename}
                            onColorChange={handleColumnColorChange}
                          />
                          {renderColumnTickets(col, columnTickets, droppableId, "min-h-[60px]", false)}
                        </div>
                      );
                    })}
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
            className="flex h-full min-w-0 items-start gap-3 overflow-x-auto pb-1 px-1"
          >
            {visibleColumns.map((col, index) => {
              const columnTickets = displayTickets
                .filter((t) => t.status === col.id)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
              const wip = wipLimits?.[col.id];
              const overWip = wip != null && columnTickets.length > wip;
              const canReorderColumn = canManage && col.statusId != null;

              return (
                <Draggable
                  key={col.id}
                  draggableId={columnDraggableId(col)}
                  index={index}
                  isDragDisabled={!canReorderColumn}
                >
                  {(columnProvided, columnSnapshot) => (
                    <div
                      ref={columnProvided.innerRef}
                      {...columnProvided.draggableProps}
                      className={cn(
                        "w-72 min-w-[280px] shrink-0 rounded-lg border bg-muted/20 flex flex-col min-h-0 self-stretch",
                        overWip && "border-destructive/60",
                        columnSnapshot.isDragging && "shadow-lg ring-2 ring-primary/20",
                      )}
                    >
                      <KanbanColumnHeader
                        column={col}
                        projectId={projectId}
                        ticketCount={columnTickets.length}
                        wipLimit={wip}
                        canManage={canManage}
                        existingNames={(optimisticStatuses ?? []).map((s) => s.name)}
                        onRename={handleColumnRename}
                        onColorChange={handleColumnColorChange}
                        quickAdd={
                          <QuickAddInput columnId={col.id} projectId={projectId} headerMode />
                        }
                        dragHandleProps={canReorderColumn ? columnProvided.dragHandleProps : null}
                      />
                      {renderColumnTickets(col, columnTickets, col.id, "min-h-[100px]", true)}
                      <div className="border-t">
                        <QuickAddInput columnId={col.id} projectId={projectId} />
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {columnsProvided.placeholder}
            <AddColumn
              projectId={projectId}
              existingNames={(optimisticStatuses ?? []).map((s) => s.name)}
            />
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
