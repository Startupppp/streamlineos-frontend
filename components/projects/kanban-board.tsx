"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { MoreHorizontal, Plus } from "lucide-react";
import { 
  useUpdateTicketOrder, 
  vaivammKeys 
} from "../../lib/hooks/trpc-hooks";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { TicketDetailsDialog } from "./ticket-details-dialog";
import { 
  CheckSquare, 
  Bug, 
  Bookmark, 
  Zap,
  ArrowUp, 
  ArrowDown, 
  AlertCircle,
  ArrowRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const TicketTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "BUG": return <Bug className="h-3 w-3 text-red-500" />;
    case "STORY": return <Bookmark className="h-3 w-3 text-green-500" />;
    case "EPIC": return <Zap className="h-3 w-3 text-purple-500" />;
    default: return <CheckSquare className="h-3 w-3 text-blue-500" />;
  }
};

const PriorityIcon = ({ priority }: { priority: string }) => {
  switch (priority) {
    case "LOW": return <ArrowDown className="h-3 w-3 text-slate-500" />;
    case "HIGH": return <ArrowUp className="h-3 w-3 text-orange-500" />;
    case "URGENT": return <AlertCircle className="h-3 w-3 text-red-500" />;
    default: return <ArrowRight className="h-3 w-3 text-blue-500" />;
  }
};

interface KanbanBoardProps {
  tickets: Array<{
    id: number;
    title: string;
    status: string;
    type: string;
    priority?: string;
    points?: number | null;
    timeSpent?: string | null;
    assignee?: { firstName?: string; lastName?: string; id: string; image?: string | null } | null;
    order?: number | null;
  }>;
  projectId: number;
}

export function KanbanBoard({ tickets, projectId }: KanbanBoardProps) {
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  
  const queryClient = useQueryClient();

  const COLUMNS = [
    { 
      id: "TODO", 
      label: "To Do", 
      dotColor: "bg-slate-400 dark:bg-slate-500",
      headerBg: "bg-slate-50 dark:bg-slate-800/50",
      borderAccent: "border-t-slate-400"
    },
    { 
      id: "IN_PROGRESS", 
      label: "In Progress", 
      dotColor: "bg-blue-500 dark:bg-blue-400",
      headerBg: "bg-blue-50/50 dark:bg-blue-950/30",
      borderAccent: "border-t-blue-500"
    },
    { 
      id: "IN_REVIEW", 
      label: "In Review", 
      dotColor: "bg-amber-500 dark:bg-amber-400",
      headerBg: "bg-amber-50/50 dark:bg-amber-950/30",
      borderAccent: "border-t-amber-500"
    },
    { 
      id: "DONE", 
      label: "Done", 
      dotColor: "bg-emerald-500 dark:bg-emerald-400",
      headerBg: "bg-emerald-50/50 dark:bg-emerald-950/30",
      borderAccent: "border-t-emerald-500"
    },
  ];

  useEffect(() => {
    setOptimisticTickets(tickets);
  }, [tickets]);

  const updateOrder = useUpdateTicketOrder({
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: vaivammKeys.project.project(projectId),
      });
      const previous = optimisticTickets;
      return { previous };
    },
    onError: (_err, _newOrder, context) => {
       const ctx = context as { previous: typeof optimisticTickets } | undefined;
       if (ctx?.previous) {
         setOptimisticTickets(ctx.previous);
       }
       toast.error("Failed to update order");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(projectId),
      });
    },
  });

  const onDragStart = () => {
    dragStartRef.current = null;
  };

  const onDragEnd = (result: DropResult) => {
    dragStartRef.current = null;
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const ticketId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    
    // Create new array of tickets
    const newTickets = [...optimisticTickets];
    const movedTicketIndex = newTickets.findIndex(t => t.id === ticketId);
    const movedTicket = { ...newTickets[movedTicketIndex], status: newStatus };
    
    // Remove from old position
    // We need to simulate the column-based structure to map indices correctly
    // Filter tickets for source and dest columns
    const sourceTickets = newTickets
        .filter(t => t.status === source.droppableId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
        
    const destTickets = source.droppableId === destination.droppableId 
        ? sourceTickets 
        : newTickets
            .filter(t => t.status === destination.droppableId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Calculate new order
    if (source.droppableId === destination.droppableId) {
        // Reordering in same column
        const items = Array.from(sourceTickets);
        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);
        
        // Update local state orders
        const updates: { id: number; status: string; order: number }[] = [];
        items.forEach((ticket, index) => {
            const tIndex = newTickets.findIndex(t => t.id === ticket.id);
            newTickets[tIndex] = { ...newTickets[tIndex], order: index };
            updates.push({ id: ticket.id, status: ticket.status, order: index });
        });
        
        setOptimisticTickets(newTickets);
        updateOrder.mutate({ projectId, items: updates });

    } else {
        // Moving to different column
        const sourceItems = Array.from(sourceTickets);
        sourceItems.splice(source.index, 1);
        
        const destItems = Array.from(destTickets);
        destItems.splice(destination.index, 0, movedTicket);
        
        // Update updates list for both columns
        const updates: { id: number; status: string; order: number }[] = [];
        
        // Update dest items
        destItems.forEach((ticket, index) => {
             const tIndex = newTickets.findIndex(t => t.id === ticket.id);
             if (tIndex !== -1) {
                newTickets[tIndex] = { ...newTickets[tIndex], status: newStatus, order: index };
                updates.push({ id: ticket.id, status: newStatus, order: index });
             }
        });
        
        // Update source items (fix gaps)
        sourceItems.forEach((ticket, index) => {
            const tIndex = newTickets.findIndex(t => t.id === ticket.id);
            newTickets[tIndex] = { ...newTickets[tIndex], order: index };
            updates.push({ id: ticket.id, status: ticket.status, order: index });
        });

        setOptimisticTickets(newTickets);
        updateOrder.mutate({ projectId, items: updates });
    }
  };

  const moveTicket = (ticketId: number, newStatus: string) => {
      // Find ticket and get max order in dest column
      const destTickets = optimisticTickets
        .filter(t => t.status === newStatus);
      const maxOrder = Math.max(...destTickets.map(t => t.order || 0), -1);
      
      const newTickets = optimisticTickets.map(t => 
        t.id === ticketId ? { ...t, status: newStatus, order: maxOrder + 1 } : t
      );
      
      setOptimisticTickets(newTickets);
      updateOrder.mutate({ 
          projectId, 
          items: [{ id: ticketId, status: newStatus, order: maxOrder + 1 }] 
      });
  };

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null; // Prevent hydration error

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div 
          className="flex h-full gap-3 sm:gap-4 md:gap-4 snap-x snap-mandatory" 
          style={{ 
            minWidth: 'max-content',
            width: 'max-content'
          }}
        >
        {COLUMNS.map((col) => {
            const columnTickets = optimisticTickets
              .filter((t) => t.status === col.id)
              .sort((a, b) => (a.order || 0) - (b.order || 0));
            return (
            <div
                key={col.id}
                className={cn(
                  "rounded-xl border border-border min-w-[240px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[300px] w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px] flex flex-col bg-muted/30 snap-start border-t-2 flex-shrink-0 h-full",
                  col.borderAccent
                )}
            >
                <div className={cn("flex items-center justify-between p-2.5 sm:p-3 rounded-t-xl", col.headerBg)}>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0", col.dotColor)} />
                      <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {col.label}
                      </h3>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="bg-background/80 text-muted-foreground text-[9px] sm:text-[10px] px-1.5 py-0 h-5 shrink-0"
                  >
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
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  Drop tickets here
                                </p>
                              </div>
                            )}
                            {columnTickets.map((ticket, index) => (
                                <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{ ...provided.draggableProps.style }}
                                        >
                                            <Card
                                            className={cn(
                                                "cursor-grab active:cursor-grabbing transition-all duration-200 bg-card group border-border",
                                                "hover:shadow-md hover:border-primary/20",
                                                snapshot.isDragging && "shadow-xl rotate-1 scale-[1.02] border-primary/30"
                                            )}
                                            onMouseDown={(e) => {
                                              dragStartRef.current = { x: e.clientX, y: e.clientY };
                                            }}
                                            onClick={(e) => {
                                              if (dragStartRef.current) {
                                                const moved = Math.abs(e.clientX - dragStartRef.current.x) > 5 || 
                                                              Math.abs(e.clientY - dragStartRef.current.y) > 5;
                                                if (!moved) {
                                                  setSelectedTicketId(ticket.id);
                                                }
                                                dragStartRef.current = null;
                                              } else {
                                                setSelectedTicketId(ticket.id);
                                              }
                                            }}
                                            >
                                            <CardContent className="p-2.5 sm:p-3 space-y-2">
                                                <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-snug flex-1">
                                                    {ticket.title}
                                                </h4>
                                                {/* Simplified Move Menu */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                    <Button 
                                                      variant="ghost" 
                                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                    {COLUMNS.map((c) => (
                                                        <DropdownMenuItem
                                                        key={c.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation(); 
                                                            moveTicket(ticket.id, c.id);
                                                        }}
                                                        disabled={c.id === ticket.status}
                                                        >
                                                        Move to {c.label}
                                                        </DropdownMenuItem>
                                                    ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                </div>
                                                
                                                <div className="flex items-center justify-between pt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <TicketTypeIcon type={ticket.type} />
                                                    {ticket.priority && (
                                                        <PriorityIcon priority={ticket.priority} />
                                                    )}
                                                    <span className="text-[10px] text-muted-foreground font-mono">#{ticket.id}</span>
                                                </div>

                                                {ticket.assignee ? (
                                                    <Avatar className="h-5 w-5 border border-background ring-2 ring-background">
                                                    <AvatarImage src={ticket.assignee.image || undefined} />
                                                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-medium">
                                                        {ticket.assignee.firstName?.[0]}
                                                        {ticket.assignee.lastName?.[0]}
                                                    </AvatarFallback>
                                                    </Avatar>
                                                ) : (
                                                    <div className="h-5 w-5 rounded-full bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center">
                                                        <span className="text-[8px] text-muted-foreground">?</span>
                                                    </div>
                                                )}
                                                </div>
                                            </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
            );
        })}

        <TicketDetailsDialog 
            ticketId={selectedTicketId}
            open={!!selectedTicketId}
            onOpenChange={(open) => !open && setSelectedTicketId(null)}
            projectId={projectId}
        />
        </div>
    </DragDropContext>
  );
}

