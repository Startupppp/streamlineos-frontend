"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { MoreHorizontal } from "lucide-react";
import { 
  useUpdateTicketStatus, 
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
  }>;
  projectId: number;
}

export function KanbanBoard({ tickets, projectId }: KanbanBoardProps) {
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();

  const COLUMNS = [
    { id: "TODO", label: "To Do", color: "bg-slate-100 dark:bg-slate-800" },
    { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50 dark:bg-blue-900/20" },
    { id: "IN_REVIEW", label: "In Review", color: "bg-yellow-50 dark:bg-yellow-900/20" },
    { id: "DONE", label: "Done", color: "bg-green-50 dark:bg-green-900/20" },
  ];

  useEffect(() => {
    setOptimisticTickets(tickets);
  }, [tickets]);

  const updateStatus = useUpdateTicketStatus({
    onMutate: async (newTicket) => {
      await queryClient.cancelQueries({
        queryKey: vaivammKeys.project.project(projectId),
      });
      const previous = optimisticTickets;
      setOptimisticTickets((prev) =>
        prev.map((t) =>
          t.id === newTicket.ticketId ? { ...t, status: newTicket.status } : t
        )
      );
      return { previous };
    },
    onError: (err, newTicket, context) => {
      if (context && typeof context === "object" && "previous" in context) {
        setOptimisticTickets(context.previous as typeof tickets);
      } else {
        setOptimisticTickets(tickets);
      }
      toast.error("Failed to update status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(projectId),
      });
    },
  });

  const onDragEnd = (result: DropResult) => {
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

    if (newStatus !== source.droppableId) {
        updateStatus.mutate({
            ticketId,
            status: newStatus,
        });
    }
  };

  const moveTicket = (ticketId: number, newStatus: string) => {
      updateStatus.mutate({ ticketId, status: newStatus });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full overflow-x-auto pb-4 gap-4 snap-x snap-mandatory px-4 md:px-0">
        {COLUMNS.map((col) => {
            const columnTickets = optimisticTickets.filter(
            (t) => t.status === col.id
            );
            return (
            <div
                key={col.id}
                className={cn("rounded-lg border p-4 min-w-[85vw] md:min-w-[280px] w-[85vw] md:w-[280px] flex flex-col bg-muted/50 snap-center md:snap-align-none")}
            >
                <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", col.color)} />
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        {col.label}
                    </h3>
                </div>
                <Badge variant="secondary" className="bg-white/50 text-[10px]">
                    {columnTickets.length}
                </Badge>
                </div>

                <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                                "flex-1 overflow-y-auto min-h-[100px] space-y-3",
                                snapshot.isDraggingOver && "bg-muted/50 rounded-lg p-2 transition-colors"
                            )}
                        >
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
                                                "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-card group",
                                                snapshot.isDragging && "shadow-lg rotate-2 opacity-90 scale-105"
                                            )}
                                            onClick={() => setSelectedTicketId(ticket.id)}
                                            >
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight flex-1">
                                                    {ticket.title}
                                                </h4>
                                                {/* Simplified Move Menu */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                    <Avatar className="h-5 w-5 border border-background">
                                                    <AvatarImage src={ticket.assignee.image || undefined} />
                                                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                                        {ticket.assignee.firstName?.[0]}
                                                        {ticket.assignee.lastName?.[0]}
                                                    </AvatarFallback>
                                                    </Avatar>
                                                ) : (
                                                    <div className="h-5 w-5 rounded-full bg-muted border border-dashed border-muted-foreground/50 flex items-center justify-center">
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
