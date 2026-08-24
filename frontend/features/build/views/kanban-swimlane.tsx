"use client";

import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import type { KanbanTicket } from "../shared/types";

interface AssigneeInfo {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image?: string | null;
}

function extractAssignee(tickets: KanbanTicket[]): AssigneeInfo | null {
  for (const t of tickets) {
    const person = t.assignees?.[0]?.user ?? t.assignee;
    if (person) return person;
  }
  return null;
}

interface SwimlaneRowHeaderProps {
  rowKey: string;
  rowBy: string;
  tickets: KanbanTicket[];
  count: number;
}

export const SwimlaneRowHeader = memo(function SwimlaneRowHeader({
  rowKey,
  rowBy,
  tickets,
  count,
}: SwimlaneRowHeaderProps) {
  if (rowBy === "assignee") {
    const assignee = extractAssignee(tickets);
    return (
      <>
        {assignee ? (
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={resolveImageUrl(assignee.image)} />
            <AvatarFallback className="text-[8px]">
              {getUserInitials(assignee)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-6 w-6 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <span className="text-sm font-semibold text-foreground">
          {assignee ? getUserDisplayName(assignee) : rowKey}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
      </>
    );
  }

  return (
    <>
      <span className="text-sm font-semibold text-foreground">{rowKey}</span>
      <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
    </>
  );
});

export function getTicketRowKey(ticket: KanbanTicket, rowBy: string): string {
  switch (rowBy) {
    case "assignee": {
      const person = ticket.assignees?.[0]?.user ?? ticket.assignee;
      if (!person) return "Unassigned";
      return getUserDisplayName(person) || "Unassigned";
    }
    case "priority": return ticket.priority ?? "None";
    case "status": return ticket.status ?? "None";
    case "cycle": return ticket.cycle?.name ?? "No cycle";
    default: return "All";
  }
}
