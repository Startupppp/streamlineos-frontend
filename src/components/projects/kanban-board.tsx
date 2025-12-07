"use client";

import { useState } from "react";
import { updateTicketStatus } from "@/app/actions/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanBoardProps {
  tickets: any[];
  projectId: number;
}

const COLUMNS = [
  { id: "TODO", label: "To Do", color: "bg-slate-100 border-slate-200" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50 border-blue-200" },
  { id: "IN_REVIEW", label: "In Review", color: "bg-yellow-50 border-yellow-200" },
  { id: "DONE", label: "Done", color: "bg-green-50 border-green-200" },
];

export function KanbanBoard({ tickets }: KanbanBoardProps) {
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);

  const moveTicket = async (ticketId: number, newStatus: string) => {
    // Optimistic Update
    setOptimisticTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateTicketStatus(ticketId, newStatus as any);
    } catch {
       // Revert on error
       console.error("Failed to move ticket");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <div key={col.id} className={cn("rounded-lg border p-4 min-h-[500px]", col.color)}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{col.label}</h3>
                <Badge variant="secondary" className="bg-white/50">{optimisticTickets.filter(t => t.status === col.id).length}</Badge>
            </div>
            
            <div className="space-y-3">
                {optimisticTickets
                    .filter((t) => t.status === col.id)
                    .map((ticket) => (
                        <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow bg-white">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-mono text-muted-foreground">#{ticket.id}</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-6 w-6 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {COLUMNS.map((c) => (
                                                <DropdownMenuItem key={c.id} onClick={() => moveTicket(ticket.id, c.id)}>
                                                    Move to {c.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <h4 className="font-medium text-sm text-foreground line-clamp-2">{ticket.title}</h4>
                                <div className="flex items-center justify-between pt-2">
                                     <Badge variant={ticket.type === 'BUG' ? 'destructive' : 'outline'} className="text-[10px] h-5">
                                        {ticket.type}
                                     </Badge>
                                     {ticket.assignee && (
                                         <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                                                {ticket.assignee.firstName?.[0]}
                                            </AvatarFallback>
                                         </Avatar>
                                     )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
            </div>
        </div>
      ))}
    </div>
  );
}
