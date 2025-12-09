"use client";

import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { MoreHorizontal, Clock } from "lucide-react";
import { useUpdateTicketStatus } from "../../lib/hooks/trpc-hooks";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { vaivammKeys } from "../../lib/hooks/trpc-hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface KanbanBoardProps {
  tickets: Array<{
    id: number;
    title: string;
    status: string;
    type: string;
    priority?: string;
    points?: number | null;
    timeSpent?: string | null;
    assignee?: { firstName?: string; lastName?: string; id: string } | null;
  }>;
  projectId: number;
}

const COLUMNS = [
  { id: "TODO", label: "To Do", color: "bg-slate-100 border-slate-200" },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    color: "bg-blue-50 border-blue-200",
  },
  {
    id: "IN_REVIEW",
    label: "In Review",
    color: "bg-yellow-50 border-yellow-200",
  },
  { id: "DONE", label: "Done", color: "bg-green-50 border-green-200" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export function KanbanBoard({ tickets, projectId }: KanbanBoardProps) {
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [draggedTicket, setDraggedTicket] = useState<number | null>(null);
  const queryClient = useQueryClient();

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
      status: newStatus as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE",
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const columnTickets = optimisticTickets.filter(
          (t) => t.status === col.id
        );
        return (
          <motion.div
            key={col.id}
            className={cn("rounded-lg border p-4 min-h-[500px]", col.color)}
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
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                {col.label}
              </h3>
              <Badge variant="secondary" className="bg-white/50">
                {columnTickets.length}
              </Badge>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {columnTickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    draggable
                    onDragStart={() => handleDragStart(ticket.id)}
                    onDragEnd={handleDragEnd}
                    data-ticket-id={ticket.id}
                  >
                    <Card
                      className={cn(
                        "cursor-move hover:shadow-md transition-shadow bg-white",
                        draggedTicket === ticket.id && "opacity-50"
                      )}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-mono text-muted-foreground">
                            #{ticket.id}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {COLUMNS.map((c) => (
                                <DropdownMenuItem
                                  key={c.id}
                                  onClick={() => moveTicket(ticket.id, c.id)}
                                  disabled={c.id === ticket.status}
                                >
                                  Move to {c.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <h4 className="font-medium text-sm text-foreground line-clamp-2">
                          {ticket.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={
                              ticket.type === "BUG" ? "destructive" : "outline"
                            }
                            className="text-[10px] h-5"
                          >
                            {ticket.type}
                          </Badge>
                          {ticket.priority && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-5",
                                PRIORITY_COLORS[ticket.priority] || ""
                              )}
                            >
                              {ticket.priority}
                            </Badge>
                          )}
                          {ticket.points && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5"
                            >
                              {ticket.points} pts
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          {ticket.timeSpent &&
                            parseFloat(ticket.timeSpent) > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {parseFloat(ticket.timeSpent).toFixed(1)}h
                              </div>
                            )}
                          {ticket.assignee && (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                                {ticket.assignee.firstName?.[0]}
                                {ticket.assignee.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
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
    </div>
  );
}
