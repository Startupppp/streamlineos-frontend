"use client";

import { type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PriorityBadge } from "../shared/priority-badge";
import { resolveImageUrl, cn } from "@/lib/utils";

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  points?: number | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  assignee?: { id: string; firstName?: string | null; lastName?: string | null; image?: string | null } | null;
}

interface TableViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  projectKey?: string | null;
}

const statusBadge: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
  TODO: { variant: "secondary", label: "Todo" },
  IN_PROGRESS: { variant: "default", label: "In Progress" },
  IN_REVIEW: { variant: "outline", label: "In Review" },
  DONE: { variant: "secondary", label: "Done" },
};

function isOverdue(ticket: Ticket): boolean {
  if (!ticket.dueDate || ticket.status === "DONE") return false;
  const due = new Date(ticket.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function TableView({ tickets, onTicketClick, projectKey }: TableViewProps) {
  function handleRowClick(e: MouseEvent<HTMLTableRowElement>) {
    const id = Number(e.currentTarget.dataset.ticketId);
    if (id) onTicketClick(id);
  }

  return (
    <div className="p-3 sm:p-4">
      <ScrollArea className="w-full border rounded-lg overflow-hidden" type="auto">
        <div className="min-w-full sm:min-w-[640px]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-24 hidden md:table-cell">Type</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24 hidden sm:table-cell">Priority</TableHead>
              <TableHead className="w-20 hidden lg:table-cell">Points</TableHead>
              <TableHead className="w-32 hidden md:table-cell">Assignee</TableHead>
              <TableHead className="w-28 hidden sm:table-cell">Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const status = statusBadge[ticket.status] ?? { variant: "secondary" as const, label: ticket.status };
              return (
                <TableRow
                  key={ticket.id}
                  data-ticket-id={ticket.id}
                  onClick={handleRowClick}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {projectKey && ticket.ticketNumber != null ? `${projectKey}-${ticket.ticketNumber}` : (ticket.sequenceId ?? `#${ticket.ticketNumber}`)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    <span className="block min-w-0 line-clamp-2 sm:truncate">{ticket.title}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">{ticket.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {ticket.priority && (
                      <PriorityBadge priority={ticket.priority} showLabel />
                    )}
                  </TableCell>
                  <TableCell className="text-xs hidden lg:table-cell">{ticket.points ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                          <AvatarFallback className="text-[7px]">
                            {ticket.assignee.firstName?.[0]}{ticket.assignee.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate">
                          {ticket.assignee.firstName} {ticket.assignee.lastName?.[0]}.
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs hidden sm:table-cell">
                    {ticket.dueDate ? (
                      <span className={cn(isOverdue(ticket) && "text-destructive font-medium")}>
                        {new Date(ticket.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No work items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
