"use client";

import { useMemo, memo, useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Bug, Bookmark, Zap, CheckSquare, ChevronRight, Plus, X, User } from "lucide-react";
import { getStatusDotClass } from "../shared/status-badge";
import { formatTicketKey } from "../shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { TicketQuickActions } from "./ticket-quick-actions";
import { useCreateTicket } from "@/hooks/api";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { DisplayOptions } from "../shared/types";

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  points?: number | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  assigneeId?: string | null;
  cycleId?: number | null;
  assignee?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; image?: string | null } | null;
  labels?: { label?: { id: number; name: string; color?: string | null } }[];
  cycle?: { id: number; name: string; status: string; startDate: string; endDate: string } | null;
}

interface ListViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  groupBy?: string;
  rowBy?: string;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
  showEmptyRows?: boolean;
  showEmptyColumns?: boolean;
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
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  onClick: (id: number) => void;
  displayOptions?: DisplayOptions;
}

const ListViewItem = memo(function ListViewItem({ ticket, projectKey, projectId, projectStatuses, onClick, displayOptions }: ListViewItemProps) {
  const TypeIcon = typeIcons[ticket.type] ?? CheckSquare;
  const handleClick = useCallback(() => onClick(ticket.id), [onClick, ticket.id]);

  const showId = displayOptions?.showId ?? true;
  const showPriority = displayOptions?.showPriority ?? true;
  const showAssignee = displayOptions?.showAssignee ?? true;
  const showEstimate = displayOptions?.showEstimate ?? true;
  const showLabels = displayOptions?.showLabels ?? true;

  return (
    <div className="group flex items-center hover:bg-muted/30 transition-colors">
      <button
        onClick={handleClick}
        className="flex flex-1 min-w-0 items-center gap-3 px-3 py-2 text-left"
      >
        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getStatusDotClass(ticket.status))} />
        <TypeIcon className={cn("h-4 w-4 flex-shrink-0", ticket.type === "BUG" ? "text-red-500" : "text-muted-foreground")} />
        {showId && (
          <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
            {formatTicketKey(projectKey, ticket.ticketNumber, ticket.sequenceId ?? undefined)}
          </span>
        )}
        <span className="text-sm text-foreground truncate flex-1">{ticket.title}</span>
        {showLabels && ticket.labels && ticket.labels.length > 0 && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {ticket.labels.slice(0, 3).map(({ label }) =>
              label ? (
                <span
                  key={label.id}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: label.color || "#3b82f6" }}
                  title={label.name}
                />
              ) : null
            )}
          </div>
        )}
        {showPriority && ticket.priority && (
          <span className={cn("text-xs font-medium flex-shrink-0", priorityColors[ticket.priority])}>
            {ticket.priority}
          </span>
        )}
        {showEstimate && ticket.points != null && ticket.points > 0 && (
          <Badge variant="outline" className="text-xs flex-shrink-0">{ticket.points}pt</Badge>
        )}
        {showAssignee && ticket.assignee && (
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
          projectStatuses={projectStatuses}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
});

interface InlineGroupCreateProps {
  groupKey: string;
  projectId: number;
  status: string;
}

function InlineGroupCreate({ groupKey, projectId, status }: InlineGroupCreateProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const createTicket = useCreateTicket({
    onSuccess: () => { setTitle(""); setOpen(false); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpenCreate() { setOpen(true); }
  function handleCancel() { setOpen(false); setTitle(""); }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && title.trim()) {
      createTicket.mutate({ projectId, title: title.trim(), status, type: "TASK" });
    }
    if (e.key === "Escape") handleCancel();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpenCreate}
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
        aria-label={`Add ticket to ${groupKey}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5">
      <Input
        autoFocus
        value={title}
        onChange={handleTitleChange}
        onKeyDown={handleKeyDown}
        placeholder="New ticket title... (Enter to create)"
        className="h-7 flex-1 text-xs"
        disabled={createTicket.isPending}
      />
      <button
        type="button"
        onClick={handleCancel}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function getGroupKey(ticket: Ticket, groupBy: string): string {
  switch (groupBy) {
    case "status": return ticket.status ?? "None";
    case "priority": return ticket.priority ?? "None";
    case "assignee": return ticket.assignee ? getUserDisplayName(ticket.assignee) : "Unassigned";
    case "label": {
      const first = ticket.labels?.[0]?.label;
      return first ? first.name : "No label";
    }
    case "cycle": return ticket.cycle?.name ?? "No cycle";
    default: return "All Items";
  }
}

function getGroupStatus(groupBy: string, groupKey: string, tickets: Ticket[]): string {
  if (groupBy === "status") return groupKey;
  return tickets[0]?.status ?? "TODO";
}

interface OuterGroupHeaderProps {
  groupKey: string;
  rowBy: string;
  tickets: Ticket[];
  count: number;
}

function OuterGroupHeader({ groupKey, rowBy, tickets, count }: OuterGroupHeaderProps) {
  if (rowBy === "assignee") {
    const assigneeTicket = tickets.find((t) => t.assignee != null);
    const assignee = assigneeTicket?.assignee ?? null;
    return (
      <div className="flex items-center gap-2 mb-3 py-1">
        {assignee ? (
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={resolveImageUrl(assignee.image)} />
            <AvatarFallback className="text-[8px]">{getUserInitials(assignee)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-6 w-6 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <span className="text-sm font-semibold text-foreground">{groupKey}</span>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-3 py-1">
      <span className="text-sm font-semibold text-foreground">{groupKey}</span>
      <Badge variant="secondary" className="text-xs">{count}</Badge>
    </div>
  );
}

interface NestedGroupProps {
  groupKey: string;
  outerGroupKey: string;
  items: Ticket[];
  groupBy: string;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
  onTicketClick: (id: number) => void;
}

function NestedGroup({ groupKey, outerGroupKey, items, groupBy, projectKey, projectId, projectStatuses, displayOptions, onTicketClick }: NestedGroupProps) {
  const status = getGroupStatus(groupBy, groupKey, items);
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1.5 pl-1">
        <span className="text-xs font-medium text-muted-foreground">{groupKey}</span>
        <Badge variant="outline" className="text-xs h-4 px-1">{items.length}</Badge>
        {projectId && (
          <InlineGroupCreate
            groupKey={`${outerGroupKey}/${groupKey}`}
            projectId={projectId}
            status={status}
          />
        )}
      </div>
      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {items.map((ticket) => (
          <ListViewItem
            key={ticket.id}
            ticket={ticket}
            projectKey={projectKey}
            projectId={projectId}
            projectStatuses={projectStatuses}
            onClick={onTicketClick}
            displayOptions={displayOptions}
          />
        ))}
      </div>
    </div>
  );
}

export const ListView = memo(function ListView({ tickets, onTicketClick, groupBy, rowBy, projectKey, projectId, projectStatuses, displayOptions, showEmptyRows }: ListViewProps) {
  const hasRowBy = !!rowBy && rowBy !== "none";

  const grouped = useMemo(() => {
    if (!groupBy || groupBy === "none") return { "All Items": tickets };
    return tickets.reduce<Record<string, Ticket[]>>((acc, t) => {
      const key = getGroupKey(t, groupBy);
      (acc[key] ??= []).push(t);
      return acc;
    }, {});
  }, [tickets, groupBy]);

  const nested = useMemo(() => {
    if (!hasRowBy) return null;
    const outerGrouped = tickets.reduce<Record<string, Ticket[]>>((acc, t) => {
      const key = getGroupKey(t, rowBy);
      (acc[key] ??= []).push(t);
      return acc;
    }, {});
    const result: Record<string, Record<string, Ticket[]>> = {};
    for (const [outerKey, outerTickets] of Object.entries(outerGrouped)) {
      result[outerKey] = {};
      if (!groupBy || groupBy === "none") {
        result[outerKey]["All Items"] = outerTickets;
      } else {
        for (const t of outerTickets) {
          const innerKey = getGroupKey(t, groupBy);
          (result[outerKey][innerKey] ??= []).push(t);
        }
      }
    }
    return result;
  }, [tickets, groupBy, rowBy, hasRowBy]);

  if (hasRowBy && nested) {
    return (
      <div className="flex flex-col gap-6 p-4">
        {Object.entries(nested).map(([outerKey, innerGroups]) => {
          const outerTickets = Object.values(innerGroups).flat();
          if (!showEmptyRows && outerTickets.length === 0) return null;
          return (
            <div key={outerKey}>
              <OuterGroupHeader
                groupKey={outerKey}
                rowBy={rowBy}
                tickets={outerTickets}
                count={outerTickets.length}
              />
              <div className="pl-4 border-l border-border space-y-0">
                {Object.entries(innerGroups).map(([innerKey, items]) => (
                  <NestedGroup
                    key={innerKey}
                    groupKey={innerKey}
                    outerGroupKey={outerKey}
                    items={items}
                    groupBy={groupBy ?? "none"}
                    projectKey={projectKey}
                    projectId={projectId}
                    projectStatuses={projectStatuses}
                    displayOptions={displayOptions}
                    onTicketClick={onTicketClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {tickets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No work items found</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          {groupBy && groupBy !== "none" && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">{group}</span>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              {projectId && (
                <InlineGroupCreate
                  groupKey={group}
                  projectId={projectId}
                  status={getGroupStatus(groupBy ?? "status", group, items)}
                />
              )}
            </div>
          )}
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {items.map((ticket) => (
              <ListViewItem
                key={ticket.id}
                ticket={ticket}
                projectKey={projectKey}
                projectId={projectId}
                projectStatuses={projectStatuses}
                onClick={onTicketClick}
                displayOptions={displayOptions}
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
