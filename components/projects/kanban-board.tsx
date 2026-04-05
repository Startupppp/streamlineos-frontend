"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateTicketOrder } from "@/lib/hooks/trpc-hooks";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { TicketDetailsDialog } from "./ticket-details-dialog";
import { KanbanTicketCard, type KanbanTicket, type KanbanColumn } from "./kanban-ticket-card";
import { QuickAddInput } from "./kanban-quick-add";

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "TODO", label: "To Do", color: "#e2e8f0" },
  { id: "IN_PROGRESS", label: "In Progress", color: "#3b82f6" },
  { id: "IN_REVIEW", label: "In Review", color: "#eab308" },
  { id: "DONE", label: "Done", color: "#22c55e" },
];

function getColumnStyle(color: string | null | undefined) {
  const c = color || "#e2e8f0";
  return { borderTopColor: c, dotColor: c };
}

interface KanbanBoardProps {
  tickets: KanbanTicket[];
  projectId: number;
  statuses?: Array<{ id: number; name: string; color: string | null; order: number }>;
  epics?: Array<{ id: number; title: string }>;
}

export function KanbanBoard({ tickets, projectId, statuses, epics }: KanbanBoardProps) {
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const queryClient = useQueryClient();
  const columns = statuses && statuses.length > 0
    ? statuses.map((s) => ({ id: s.name, label: s.name.replace(/_/g, " "), color: s.color }))
    : DEFAULT_COLUMNS;

  const epicMap = new Map<number, string>();
  epics?.forEach((e) => epicMap.set(e.id, e.title));

  useEffect(() => { setOptimisticTickets(tickets); }, [tickets]);
  useEffect(() => { setIsMounted(true); }, []);

  const updateOrder = useUpdateTicketOrder({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });
      return { previous: optimisticTickets };
    },
    onError: (_err, _newOrder, context) => {
      const ctx = context as { previous: typeof optimisticTickets } | undefined;
      if (ctx?.previous) setOptimisticTickets(ctx.previous);
      toast.error("Failed to update order");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });

  const moveTicket = useCallback((ticketId: number, newStatus: string) => {
    const destTickets = optimisticTickets.filter((t) => t.status === newStatus);
    const maxOrder = Math.max(...destTickets.map((t) => t.order || 0), -1);
    setOptimisticTickets((prev) =>
      prev.map((t) => t.id === ticketId ? { ...t, status: newStatus, order: maxOrder + 1 } : t)
    );
    updateOrder.mutate({ projectId, items: [{ id: ticketId, status: newStatus, order: maxOrder + 1 }] });
  }, [optimisticTickets, updateOrder, projectId]);

  const handleSelect = useCallback((id: number) => setSelectedTicketId(id), []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTicketId(null);
  }, []);

  const onDragStart = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  const onDragEnd = useCallback((result: DropResult) => {
    dragStartRef.current = null;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const ticketId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    const newTickets = [...optimisticTickets];
    const movedTicket = { ...newTickets.find((t) => t.id === ticketId)!, status: newStatus };

    const sourceTickets = newTickets
      .filter((t) => t.status === source.droppableId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const destTickets = source.droppableId === destination.droppableId
      ? sourceTickets
      : newTickets.filter((t) => t.status === destination.droppableId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

    const updates: { id: number; status: string; order: number }[] = [];

    if (source.droppableId === destination.droppableId) {
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
          newTickets[tIndex] = { ...newTickets[tIndex], status: newStatus, order: index };
          updates.push({ id: ticket.id, status: newStatus, order: index });
        }
      });
      sourceItems.forEach((ticket, index) => {
        const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
        newTickets[tIndex] = { ...newTickets[tIndex], order: index };
        updates.push({ id: ticket.id, status: ticket.status, order: index });
      });
    }

    setOptimisticTickets(newTickets);
    updateOrder.mutate({ projectId, items: updates });
  }, [optimisticTickets, updateOrder, projectId]);

  if (!isMounted) return null;

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-3 sm:gap-4 snap-x snap-mandatory overflow-x-auto pb-2" style={{ minWidth: "min-content" }}>
        {columns.map((col) => {
          const style = getColumnStyle(col.color);
          const columnTickets = optimisticTickets
            .filter((t) => t.status === col.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          return (
            <div
              key={col.id}
              className="rounded-xl border border-border min-w-[240px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[300px] w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px] flex flex-col bg-muted/30 snap-start border-t-2 flex-shrink-0 h-full"
              style={{ borderTopColor: style.borderTopColor }}
            >
              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-t-xl bg-muted/50">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0" style={{ backgroundColor: style.dotColor }} />
                  <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">{col.label}</h3>
                </div>
                <Badge variant="secondary" className="bg-background/80 text-muted-foreground text-[9px] sm:text-[10px] px-1.5 py-0 h-5 shrink-0">
                  {columnTickets.length}
                </Badge>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 overflow-y-auto min-h-[120px] p-2 sm:p-2.5 space-y-2 transition-colors duration-200",
                      snapshot.isDraggingOver && "bg-primary/5"
                    )}
                  >
                    {columnTickets.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center px-2">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
                          <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Drop tickets here</p>
                      </div>
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
                              columns={columns}
                              epicMap={epicMap}
                              isDragging={draggableSnapshot.isDragging}
                              dragStartRef={dragStartRef}
                              onSelect={handleSelect}
                              onMove={moveTicket}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <div className="border-t border-border">
                <QuickAddInput columnId={col.id} projectId={projectId} />
              </div>
            </div>
          );
        })}

        <TicketDetailsDialog
          ticketId={selectedTicketId}
          open={!!selectedTicketId}
          onOpenChange={handleDialogOpenChange}
          projectId={projectId}
          statuses={statuses?.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </DragDropContext>
  );
}
