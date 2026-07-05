"use client";

import { memo, useCallback } from "react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { TicketTypeIcon } from "@/features/projects/shared/ticket-type-icon";
import { PriorityBadge } from "@/features/projects/shared/priority-badge";
import { StatusBadge } from "@/features/projects/shared/status-badge";
import { formatTicketKey } from "@/features/projects/shared/format-ticket-key";
import { resolveImageUrl } from "@/lib/utils";

export interface BacklogTicket {
  id: number;
  ticketNumber: string | number;
  title: string | null;
  description?: string | null;
  status: string;
  priority: string | null;
  type: string;
  assigneeId?: string | null;
  createdAt?: string | Date | null;
  assignee?: {
    image?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

interface BacklogTicketRowProps {
  ticket: BacklogTicket;
  projectKey?: string | null;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onToggleSelect: (id: number) => void;
}

export const BacklogTicketRow = memo(function BacklogTicketRow({
  ticket,
  projectKey,
  isSelected,
  onSelect,
  onToggleSelect,
}: BacklogTicketRowProps) {
  const handleRowClick = useCallback(() => onSelect(ticket.id), [onSelect, ticket.id]);
  const handleCheckboxCellClick = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onToggleSelect(ticket.id); },
    [onToggleSelect, ticket.id],
  );
  const handleCheckedChange = useCallback(
    () => onToggleSelect(ticket.id),
    [onToggleSelect, ticket.id],
  );

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 h-8 border-b border-border/50 ${isSelected ? "bg-primary/5" : ""}`}
      onClick={handleRowClick}
    >
      <TableCell className="px-2 py-1" onClick={handleCheckboxCellClick}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckedChange}
          aria-label={`Select ticket ${ticket.ticketNumber}`}
        />
      </TableCell>
      <TableCell className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <TicketTypeIcon type={ticket.type} />
          {formatTicketKey(projectKey, ticket.ticketNumber)}
        </span>
      </TableCell>
      <TableCell className="px-2 py-1 max-w-md">
        <span className="text-[11px] font-medium line-clamp-1">{ticket.title}</span>
      </TableCell>
      <TableCell className="px-2 py-1">
        <StatusBadge status={ticket.status} />
      </TableCell>
      <TableCell className="px-2 py-1 hidden sm:table-cell">
        <PriorityBadge priority={ticket.priority} showLabel />
      </TableCell>
      <TableCell className="px-2 py-1 hidden md:table-cell">
        {ticket.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-6 w-6">
              <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
              <AvatarFallback className="text-[8px]">
                {ticket.assignee.firstName?.[0]}
                {ticket.assignee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] truncate">{ticket.assignee.firstName}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden lg:table-cell">
        {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d") : "—"}
      </TableCell>
    </TableRow>
  );
});
