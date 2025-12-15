"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import { MoreHorizontal, Plus, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { 
  useUpdateTicketStatus, 
  useCreateProjectStatus, 
  useDeleteProjectStatus, 
  useUpdateProjectStatusOrder,
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
  ArrowDown, 
  ArrowUp, 
  AlertCircle 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

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
  statuses: Array<{
    id: number;
    name: string;
    order: number;
    color: string | null;
  }>;
}

export function KanbanBoard({ tickets, projectId, statuses }: KanbanBoardProps) {
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [draggedTicket, setDraggedTicket] = useState<number | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const createStatus = useCreateProjectStatus();
  const deleteStatus = useDeleteProjectStatus();
  const updateStatusOrder = useUpdateProjectStatusOrder();

  const sortedColumns = [...statuses].sort((a, b) => a.order - b.order);

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

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    try {
      await createStatus.mutateAsync({
        projectId,
        name: newColumnName,
        color: "#e2e8f0" // Default color
      });
      setNewColumnName("");
      setIsAddOpen(false);
      toast.success("Column added");
    } catch {
      toast.error("Failed to add column");
    }
  };

  const handleDeleteColumn = async (id: number) => {
    try {
      await deleteStatus.mutateAsync({ statusId: id, projectId });
      toast.success("Column deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete column");
    }
  };

  const handleMoveColumn = async (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index === 0) return;
    if (direction === 'right' && index === sortedColumns.length - 1) return;

    const newColumns = [...sortedColumns];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
    // Swap
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    
    // Extract IDs in new order
    const statusIds = newColumns.map(c => c.id);
    
    try {
      await updateStatusOrder.mutateAsync({ projectId, statusIds });
      // Optimistic update handled by invalidation or could serve locally
    } catch {
      toast.error("Failed to move column");
    }
  };

  return (
    <div className="flex h-full overflow-x-auto pb-4 gap-4">
      {sortedColumns.map((col, index) => {
        const columnTickets = optimisticTickets.filter(
          (t) => t.status === col.name // Match by NAME since ticket.status is text now
        );
        return (
          <motion.div
            key={col.id}
            className={cn("rounded-lg border p-4 min-w-[280px] w-[280px] flex flex-col bg-slate-50/50")}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const ticketId = parseInt(e.dataTransfer.getData("ticketId"));
              if (ticketId) {
                handleDrop(col.name, ticketId);
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color || '#e2e8f0' }} />
                 <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {col.name}
                 </h3>
              </div>
              <div className="flex items-center gap-1">
                 <Badge variant="secondary" className="bg-white/50 text-[10px]">
                    {columnTickets.length}
                 </Badge>
                 
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-4 w-4" />
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                       <DropdownMenuItem 
                          disabled={index === 0}
                          onClick={() => handleMoveColumn(index, 'left')}
                       >
                          <ArrowLeft className="h-4 w-4 mr-2" /> Move Left
                       </DropdownMenuItem>
                       <DropdownMenuItem 
                          disabled={index === sortedColumns.length - 1}
                          onClick={() => handleMoveColumn(index, 'right')}
                       >
                          <ArrowRight className="h-4 w-4 mr-2" /> Move Right
                       </DropdownMenuItem>
                       <DropdownMenuSeparator />
                       <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteColumn(col.id)}
                       >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
              </div>
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
                       (e as any).dataTransfer.setData("ticketId", ticket.id.toString());
                       handleDragStart(ticket.id);
                    }}
                    onDragEnd={handleDragEnd}
                    data-ticket-id={ticket.id}
                  >
                    <Card
                      className={cn(
                        "cursor-move hover:shadow-md transition-shadow bg-white group",
                        draggedTicket === ticket.id && "opacity-50"
                      )}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                           <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight flex-1">
                             {ticket.title}
                           </h4>
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {sortedColumns.map((c) => (
                                <DropdownMenuItem
                                  key={c.id}
                                  onClick={(e) => {
                                      e.stopPropagation(); 
                                      moveTicket(ticket.id, c.name);
                                  }}
                                  disabled={c.name === ticket.status}
                                >
                                  Move to {c.name}
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

       <div className="min-w-[280px] w-[280px]">
          <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
             <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-[50px] border-dashed text-muted-foreground hover:text-foreground">
                   <Plus className="mr-2 h-4 w-4" /> Add Column
                </Button>
             </PopoverTrigger>
             <PopoverContent className="w-[280px] p-4">
                <div className="space-y-4">
                    <h4 className="font-medium leading-none">New Column</h4>
                    <div className="space-y-2">
                        <Input 
                           placeholder="Column Name" 
                           value={newColumnName}
                           onChange={(e) => setNewColumnName(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                        />
                        <Button className="w-full" onClick={handleAddColumn} disabled={!newColumnName.trim()}>
                           Create
                        </Button>
                    </div>
                </div>
             </PopoverContent>
          </Popover>
       </div>
      
      <TicketDetailsDialog 
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => !open && setSelectedTicketId(null)}
        projectId={projectId}
        statuses={sortedColumns}
      />
    </div>
  );
}
