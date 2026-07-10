"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateTicketOrder } from "@/hooks/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
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
import { SwimlaneRowHeader, getTicketRowKey } from "./kanban-swimlane";
import type { KanbanTicket, KanbanColumn, DisplayOptions } from "../shared/types";
import { AnimatePresence, motion } from "framer-motion";

type UpdateOrderContext = { previous: KanbanTicket[] };

function isUpdateOrderContext(v: unknown): v is UpdateOrderContext {
  return typeof v === "object" && v !== null && "previous" in v;
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
}

function encodeRowKey(key: string): string {
  return key.replace(/\|/g, "__PIPE__");
}

function decodeRowKey(key: string): string {
  return key.replace(/__PIPE__/g, "|");
}

export function KanbanBoard({
  tickets,
  projectId,
  projectKey,
  statuses,
  onTicketSelect,
  wipLimits,
  displayOptions,
}: KanbanBoardProps) {
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [isMounted, setIsMounted] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevTicketsRef = useRef(tickets);
  if (prevTicketsRef.current !== tickets) {
    prevTicketsRef.current = tickets;
    setOptimisticTickets(tickets);
  }
  const queryClient = useQueryClient();

  const rowBy = displayOptions?.rowBy ?? "none";
  const showEmptyColumns = displayOptions?.showEmptyColumns ?? true;
  const showEmptyRows = displayOptions?.showEmptyRows ?? false;

  const columns = useMemo<KanbanColumn[]>(() => {
    if (!statuses || statuses.length === 0) return DEFAULT_COLUMNS;
    const configured = statuses.map((s) => ({
      id: s.name,
      name: s.name.replace(/_/g, " "),
      color: s.color,
      order: s.order,
    }));
    const configuredIds = new Set(configured.map((c) => c.id));
    const orphanStatuses = [...new Set(optimisticTickets.map((t) => t.status))].filter(
      (s) => !configuredIds.has(s),
    );
    if (orphanStatuses.length === 0) return configured;
    return [
      ...configured,
      ...orphanStatuses.map((s, i) => ({
        id: s,
        name: s.replace(/_/g, " "),
        color: null as string | null,
        order: configured.length + i,
      })),
    ];
  }, [statuses, optimisticTickets]);

  const swimlaneRows = useMemo<string[]>(() => {
    if (rowBy === "none") return [];
    const keys = [...new Set(optimisticTickets.map((t) => getTicketRowKey(t, rowBy)))];
    return keys;
  }, [optimisticTickets, rowBy]);

  const visibleColumns = useMemo<KanbanColumn[]>(() => {
    if (showEmptyColumns) return columns;
    if (rowBy === "none") {
      return columns.filter((col) => optimisticTickets.some((t) => t.status === col.id));
    }
    return columns.filter((col) =>
      swimlaneRows.some((rowKey) =>
        optimisticTickets.some(
          (t) => t.status === col.id && getTicketRowKey(t, rowBy) === rowKey,
        ),
      ),
    );
  }, [columns, showEmptyColumns, rowBy, optimisticTickets, swimlaneRows]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateOrder = useUpdateTicketOrder({
    onMutate: async (): Promise<UpdateOrderContext> => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      return { previous: optimisticTickets };
    },
    onError: (_, __, context) => {
      if (isUpdateOrderContext(context)) setOptimisticTickets(context.previous);
      toast.error("Failed to update order");
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

  const onDragStart = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      dragStartRef.current = null;
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
    [optimisticTickets, updateOrder, projectId, rowBy],
  );

  if (!isMounted) return null;

  if (rowBy !== "none") {
    return (
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-6 h-full min-w-0 overflow-auto pb-1 px-1">
          {swimlaneRows.map((rowKey) => {
            const rowTickets = optimisticTickets.filter(
              (t) => getTicketRowKey(t, rowBy) === rowKey,
            );
            if (!showEmptyRows && rowTickets.length === 0) return null;
            return (
              <div key={rowKey} className="min-w-0">
                <SwimlaneRowHeader
                  rowKey={rowKey}
                  rowBy={rowBy}
                  tickets={rowTickets}
                  count={rowTickets.length}
                />
                <div className="flex gap-3 overflow-x-auto pb-1">
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
                          "w-72 min-w-[280px] shrink-0 rounded-lg border bg-muted/20 flex flex-col min-h-0",
                          overWip && "border-destructive/60",
                        )}
                      >
                        <div className="relative flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: col.color || "#94a3b8" }}
                            />
                            <h3 className="font-medium text-[13px] text-foreground truncate">
                              {col.name}
                            </h3>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {columnTickets.length}
                              {wip != null && `/${wip}`}
                            </span>
                          </div>
                        </div>

                        <Droppable droppableId={droppableId}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                "flex-1 overflow-y-auto scrollbar-hide min-h-[60px] px-2 pb-2 space-y-1.5 transition-colors",
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
                                    className="flex flex-col items-center justify-center py-6 text-center"
                                  >
                                    <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
                                      <Plus className="h-4 w-4 text-muted-foreground/50" />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">Drop tickets here</p>
                                  </motion.div>
                                )}
                                {columnTickets.map((ticket, index) => (
                                  <Draggable
                                    key={ticket.id}
                                    draggableId={ticket.id.toString()}
                                    index={index}
                                  >
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
                                          projectStatuses={statuses}
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
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    );
  }

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full min-w-0 gap-3 overflow-x-auto pb-1 px-1">
        {visibleColumns.map((col) => {
          const columnTickets = optimisticTickets
            .filter((t) => t.status === col.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          const wip = wipLimits?.[col.id];
          const overWip = wip != null && columnTickets.length > wip;

          return (
            <div
              key={col.id}
              className={cn(
                "w-72 min-w-[280px] shrink-0 rounded-lg border bg-muted/20 flex flex-col min-h-0",
                overWip && "border-destructive/60",
              )}
            >
              <div className="relative flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: col.color || "#94a3b8" }}
                  />
                  <h3 className="font-medium text-[13px] text-foreground truncate">
                    {col.name}
                  </h3>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {columnTickets.length}
                    {wip != null && `/${wip}`}
                  </span>
                </div>
                <QuickAddInput columnId={col.id} projectId={projectId} headerMode />
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 overflow-y-auto scrollbar-hide min-h-[100px] px-2 pb-2 space-y-1.5 transition-colors",
                      snapshot.isDraggingOver && "bg-primary/5",
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {columnTickets.length === 0 &&
                        !snapshot.isDraggingOver && (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-8 text-center"
                          >
                            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
                              <Plus className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Drop tickets here
                            </p>
                          </motion.div>
                        )}
                      {columnTickets.map((ticket, index) => (
                        <Draggable
                          key={ticket.id}
                          draggableId={ticket.id.toString()}
                          index={index}
                        >
                          {(draggableProvided, draggableSnapshot) => (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              style={{
                                ...draggableProvided.draggableProps.style,
                              }}
                            >
                              <KanbanTicketCard
                                ticket={ticket}
                                projectId={projectId}
                                projectKey={projectKey}
                                isDragging={draggableSnapshot.isDragging}
                                dragStartRef={dragStartRef}
                                onSelect={handleSelect}
                                projectStatuses={statuses}
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

              <div className="border-t">
                <QuickAddInput columnId={col.id} projectId={projectId} />
              </div>
            </div>
          );
        })}
        <AddColumn projectId={projectId} />
      </div>
    </DragDropContext>
  );
}
