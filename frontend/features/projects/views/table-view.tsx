"use client";

import { memo, type MouseEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "../shared/status-badge";
import { formatTicketKey } from "../shared/format-ticket-key";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { TicketQuickActions } from "./ticket-quick-actions";

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
  assignee?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; image?: string | null } | null;
}

interface TableViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
}

function isOverdue(ticket: Ticket): boolean {
  if (!ticket.dueDate || ticket.status === "DONE") return false;
  const due = new Date(ticket.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export const TableView = memo(function TableView({ tickets, onTicketClick, projectKey, projectId, projectStatuses }: TableViewProps) {
  function handleRowClick(e: MouseEvent<HTMLTableRowElement>) {
    const id = Number(e.currentTarget.dataset.ticketId);
    if (id) onTicketClick(id);
  }

  return (
    <div className="p-3 sm:p-4">
      <ScrollArea className="w-full border border-border rounded-md overflow-hidden" type="auto">
        <div className="min-w-full sm:min-w-[640px]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <TableRow className="border-b-2 border-border">
              <TableHead className="w-16 text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">ID</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Title</TableHead>
              <TableHead className="w-24 hidden md:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Type</TableHead>
              <TableHead className="w-28 text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
              <TableHead className="w-24 hidden sm:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Priority</TableHead>
              <TableHead className="w-20 hidden lg:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Points</TableHead>
              <TableHead className="w-32 hidden md:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Assignee</TableHead>
              <TableHead className="w-28 hidden sm:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Due Date</TableHead>
              <TableHead className="w-10 px-2 py-1.5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              return (
                <TableRow
                  key={ticket.id}
                  data-ticket-id={ticket.id}
                  onClick={handleRowClick}
                  className="h-8 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
                    {formatTicketKey(projectKey, ticket.ticketNumber, ticket.sequenceId ?? undefined)}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="block min-w-0 truncate text-[13px] font-medium">{ticket.title}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell px-2 py-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{ticket.type}</Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell px-2 py-1">
                    {ticket.priority && (
                      <PriorityBadge priority={ticket.priority} showLabel />
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell px-2 py-1 font-mono text-[11px] tabular-nums">
                    {ticket.points ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell px-2 py-1">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                          <AvatarFallback className="text-[7px]">
                            {getUserInitials(ticket.assignee)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] truncate">
                          {getUserDisplayName(ticket.assignee)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell px-2 py-1 font-mono text-[11px] tabular-nums">
                    {ticket.dueDate ? (
                      <span className={cn(isOverdue(ticket) && "text-destructive font-medium")}>
                        {new Date(ticket.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-1">
                    <TicketQuickActions
                      ticketId={ticket.id}
                      projectId={projectId}
                      currentStatus={ticket.status}
                      currentPriority={ticket.priority}
                      currentAssigneeId={ticket.assignee?.id}
                      projectStatuses={projectStatuses}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
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
});
