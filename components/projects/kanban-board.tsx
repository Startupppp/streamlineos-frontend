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
import { motion, AnimatePresence } from "framer-motion";
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
  const [draggedTicket, setDraggedTicket] = useState<number | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  // const [newColumnName, setNewColumnName] = useState(""); // Removed
  // const [isAddOpen, setIsAddOpen] = useState(false); // Removed
  
  const queryClient = useQueryClient();
  // const createStatus = useCreateProjectStatus(); // Removed
  // const deleteStatus = useDeleteProjectStatus(); // Removed
  // const updateStatusOrder = useUpdateProjectStatusOrder(); // Removed

  // Revert to static columns as requested
  const COLUMNS = [
    { id: "TODO", label: "To Do", color: "bg-slate-100 dark:bg-slate-800" },
    { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50 dark:bg-blue-900/20" },
    { id: "IN_REVIEW", label: "In Review", color: "bg-yellow-50 dark:bg-yellow-900/20" },
    { id: "DONE", label: "Done", color: "bg-green-50 dark:bg-green-900/20" },
  ];

  // const DEFAULT_COLUMNS = [ // Removed
  //   { id: -1, name: "TODO", order: 0, color: "#f1f5f9" },
  //   { id: -2, name: "IN_PROGRESS", order: 1, color: "#eff6ff" },
  //   { id: -3, name: "IN_REVIEW", order: 2, color: "#fefce8" },
  //   { id: -4, name: "DONE", order: 3, color: "#f0fdf4" },
  // ];

  // const sortedColumns = statuses.length > 0 // Removed
  //   ? [...statuses].sort((a, b) => a.order - b.order)
  //   : DEFAULT_COLUMNS;

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

  const moveTicket = async (ticketId: number, newStatus: string) => {
    updateStatus.mutate({
      ticketId,
      status: newStatus,
    });
  };

  const handleDragStart = (ticketId: number) => {
    setDraggedTicket(ticketId);
  };

  const handleDragEnd = () => {
    setDraggedTicket(null);
  };

  const handleDrop = (columnId: string, ticketId: number) => {
    if (ticketId && columnId) {
      moveTicket(ticketId, columnId);
    }
    setDraggedTicket(null);
  };

  // const handleAddColumn = async () => { // Removed
  //   if (!newColumnName.trim()) return;
  //   try {
  //     await createStatus.mutateAsync({
  //       projectId,
  //       name: newColumnName,
  //       color: "#e2e8f0" // Default color
  //     });
  //     setNewColumnName("");
  //     setIsAddOpen(false);
  //     toast.success("Column added");
  //   } catch {
  //     toast.error("Failed to add column");
  //   }
  // };

  // const handleDeleteColumn = async (id: number) => { // Removed
  //   try {
  //     await deleteStatus.mutateAsync({ statusId: id, projectId });
  //     toast.success("Column deleted");
  //   } catch (error: any) {
  //     toast.error(error.message || "Failed to delete column");
  //   }
  // };

  // const handleMoveColumn = async (index: number, direction: 'left' | 'right') => { // Removed
  //   if (direction === 'left' && index === 0) return;
  //   if (direction === 'right' && index === sortedColumns.length - 1) return;

  //   const newColumns = [...sortedColumns];
  //   const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
  //   // Swap
  //   [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    
  //   // Extract IDs in new order
  //   const statusIds = newColumns.map(c => c.id);
    
  //   try {
  //     await updateStatusOrder.mutateAsync({ projectId, statusIds });
  //     // Optimistic update handled by invalidation or could serve locally
  //   } catch {
  //     toast.error("Failed to move column");
  //   }
  // };

  return (
    <div className="flex h-full overflow-x-auto pb-4 gap-4 snap-x snap-mandatory px-4 md:px-0">
      {COLUMNS.map((col) => {
        const columnTickets = optimisticTickets.filter(
          (t) => t.status === col.id // Match by ID
        );
        return (
          <motion.div
            key={col.id}
            className={cn("rounded-lg border p-4 min-w-[85vw] md:min-w-[280px] w-[85vw] md:w-[280px] flex flex-col bg-muted/50 snap-center md:snap-align-none")}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const ticketId = parseInt(e.dataTransfer.getData("ticketId"));
              if (ticketId) {
                handleDrop(col.id, ticketId);
              }
            }}
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

            <div className="space-y-3 flex-1 overflow-y-auto min-h-[50px]">
              <AnimatePresence>
                {columnTickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    draggable
                    onDragStart={(e) => {
                       // Fix: Set dataTransfer here
                       const dragEvent = e as unknown as React.DragEvent<HTMLDivElement>;
                       dragEvent.dataTransfer.setData("ticketId", ticket.id.toString());
                       handleDragStart(ticket.id);
                    }}
                    onDragEnd={handleDragEnd}
                    data-ticket-id={ticket.id}
                  >
                    <Card
                       className={cn(
                         "cursor-move hover:shadow-md transition-shadow bg-card group",
                         draggedTicket === ticket.id && "opacity-50"
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}

       {/* Removed Add Column UI */}
      
      <TicketDetailsDialog 
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => !open && setSelectedTicketId(null)}
        projectId={projectId}
        // statuses={sortedColumns} // Removed
      />
    </div>
  );
}
