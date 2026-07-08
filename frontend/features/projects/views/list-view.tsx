"use client";

import { useMemo, memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Bug, Bookmark, Zap, CheckSquare, ChevronRight } from "lucide-react";
import { getStatusDotClass } from "../shared/status-badge";
import { formatTicketKey } from "../shared/format-ticket-key";
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
  assignee?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; image?: string | null } | null;
}

interface ListViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  groupBy?: keyof Ticket;
  projectKey?: string | null;
  projectId?: number;
}

const typeIcons: Record<string, typeof CheckSquare> = {
  TASK: CheckSquare,
  BUG: Bug,
  STORY: Bookmark,
  EPIC: Zap,
};

const priorityColors: Record<string, string> = {
  URGENT: "text-red-500",
  HIGH: "text-orange-500",
  MEDIUM: "text-yellow-500",
  LOW: "text-blue-400",
};

interface ListViewItemProps {
  ticket: Ticket;
  projectKey?: string | null;
  projectId?: number;
  onClick: (id: number) => void;
}

const ListViewItem = memo(function ListViewItem({ ticket, projectKey, projectId, onClick }: ListViewItemProps) {
  const TypeIcon = typeIcons[ticket.type] ?? CheckSquare;
  const handleClick = useCallback(() => onClick(ticket.id), [onClick, ticket.id]);

  return (
    <div className="group flex items-center hover:bg-muted/30 transition-colors">
      <button
        onClick={handleClick}
        className="flex flex-1 min-w-0 items-center gap-3 px-3 py-2 text-left"
      >
        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getStatusDotClass(ticket.status))} />
        <TypeIcon className={cn("h-4 w-4 flex-shrink-0", ticket.type === "BUG" ? "text-red-500" : "text-muted-foreground")} />
        <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
          {formatTicketKey(projectKey, ticket.ticketNumber, ticket.sequenceId ?? undefined)}
        </span>
        <span className="text-sm text-foreground truncate flex-1">{ticket.title}</span>
        {ticket.priority && (
          <span className={cn("text-xs font-medium flex-shrink-0", priorityColors[ticket.priority])}>
            {ticket.priority}
          </span>
        )}
        {ticket.points && (
          <Badge variant="outline" className="text-xs flex-shrink-0">{ticket.points}pt</Badge>
        )}
        {ticket.assignee && (
          <Avatar className="h-6 w-6 flex-shrink-0" title={getUserDisplayName(ticket.assignee)}>
            <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
            <AvatarFallback className="text-[8px]">
              {getUserInitials(ticket.assignee)}
            </AvatarFallback>
          </Avatar>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>
      <div className="pr-2 flex-shrink-0">
        <TicketQuickActions
          ticketId={ticket.id}
          projectId={projectId}
          currentStatus={ticket.status}
          currentPriority={ticket.priority}
          currentAssigneeId={ticket.assignee?.id}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
});

export const ListView = memo(function ListView({ tickets, onTicketClick, groupBy, projectKey, projectId }: ListViewProps) {
  const grouped = useMemo(
    () =>
      groupBy
        ? tickets.reduce<Record<string, Ticket[]>>((acc, t) => {
            const key = String(t[groupBy] ?? "None");
            (acc[key] ??= []).push(t);
            return acc;
          }, {})
        : { "All Items": tickets },
    [tickets, groupBy],
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          {groupBy && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">{group}</span>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
            </div>
          )}
          <div className="border border-border rounded-lg divide-y divide-border">
            {items.map((ticket) => (
              <ListViewItem
                key={ticket.id}
                ticket={ticket}
                projectKey={projectKey}
                projectId={projectId}
                onClick={onTicketClick}
              />
            ))}
          </div>
        </div>
      ))}
      {tickets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No work items found</div>
      )}
    </div>
  );
});
