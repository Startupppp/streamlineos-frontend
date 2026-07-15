"use client";

import { memo, useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn, resolveImageUrl } from "@/lib/utils";
import { ChevronRight, Plus, X, User } from "lucide-react";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { getStatusDotClass } from "../shared/status-badge";
import { formatTicketKey } from "../shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlineStatus, InlinePriority, InlineAssignee, InlineEstimate } from "./card-inline-fields";
import { InlineType, InlineLabels } from "./card-inline-extra-fields";
import { InlineDueDate } from "./card-inline-date-fields";
import { useCreateTicket } from "@/hooks/api";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { DisplayOptions } from "../shared/types";
import { pmSnappy } from "@/features/projects/shared/pm-motion";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import type { Ticket } from "./list-view";

export interface ListViewItemProps {
  ticket: Ticket;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  onClick: (id: number) => void;
  displayOptions?: DisplayOptions;
}

export const ListViewItem = memo(function ListViewItem({ ticket, projectKey, projectId, projectStatuses, onClick, displayOptions }: ListViewItemProps) {
  const handleClick = useCallback(() => onClick(ticket.id), [onClick, ticket.id]);
  const shouldReduceMotion = useReducedMotion();

  const showId = displayOptions?.showId ?? true;
  const showPriority = displayOptions?.showPriority ?? true;
  const showAssignee = displayOptions?.showAssignee ?? true;
  const showEstimate = displayOptions?.showEstimate ?? true;
  const showLabels = displayOptions?.showLabels ?? true;

  const labelIds = ticket.labels
    ?.map((l) => l.label?.id)
    .filter((v): v is number => v != null) ?? [];

  const hasProjectId = projectId != null;

  return (
    <motion.div
      className="group flex items-center border-b border-border/50 bg-card last:border-b-0"
      initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={pmSnappy}
      whileHover={
        shouldReduceMotion
          ? undefined
          : { backgroundColor: "color-mix(in srgb, var(--primary) 4%, transparent)", x: 1 }
      }
    >
      <div className="flex flex-1 min-w-0 items-center gap-2 px-3 py-1.5">
        {hasProjectId ? (
          <InlineStatus
            ticketId={ticket.id}
            projectId={projectId}
            currentStatus={ticket.status}
            projectStatuses={projectStatuses}
          />
        ) : (
          <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getStatusDotClass(ticket.status))} />
        )}
        {hasProjectId ? (
          <InlineType
            ticketId={ticket.id}
            projectId={projectId}
            currentType={ticket.type}
          />
        ) : (
          <TicketTypeIcon type={ticket.type} size="sm" />
        )}
        {showId && (
          <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
            {formatTicketKey(projectKey, ticket.ticketNumber, ticket.sequenceId ?? undefined)}
          </span>
        )}
        <button
          onClick={handleClick}
          className={cn(
            "flex-1 text-left text-sm text-foreground hover:underline underline-offset-2",
            TEXT_ONE_LINE,
          )}
          title={ticket.title}
        >
          {ticket.title}
        </button>
        {showLabels && hasProjectId && (
          <InlineLabels
            ticketId={ticket.id}
            projectId={projectId}
            currentLabelIds={labelIds}
          />
        )}
        {showPriority && hasProjectId ? (
          <InlinePriority
            ticketId={ticket.id}
            projectId={projectId}
            currentPriority={ticket.priority}
          />
        ) : showPriority && ticket.priority ? (
          <span className="text-xs font-medium flex-shrink-0 text-muted-foreground">{ticket.priority}</span>
        ) : null}
        {showEstimate && hasProjectId ? (
          <InlineEstimate
            ticketId={ticket.id}
            projectId={projectId}
            currentPoints={ticket.points}
          />
        ) : showEstimate && ticket.points != null && ticket.points > 0 ? (
          <Badge variant="outline" className="text-xs flex-shrink-0">{ticket.points}pt</Badge>
        ) : null}
        {hasProjectId && (
          <InlineDueDate
            ticketId={ticket.id}
            projectId={projectId}
            currentDueDate={ticket.dueDate}
          />
        )}
        {showAssignee && hasProjectId ? (
          <InlineAssignee
            ticketId={ticket.id}
            projectId={projectId}
            currentAssigneeId={ticket.assigneeId ?? ticket.assignee?.id}
            assignee={ticket.assignee}
          />
        ) : showAssignee && ticket.assignee ? (
          <Avatar className="h-6 w-6 flex-shrink-0" title={getUserDisplayName(ticket.assignee)}>
            <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
            <AvatarFallback className="text-[8px]">{getUserInitials(ticket.assignee)}</AvatarFallback>
          </Avatar>
        ) : null}
        <button
          onClick={handleClick}
          className="ml-1 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open ticket"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="pr-2 flex-shrink-0">
        <TicketQuickActions
          ticketId={ticket.id}
          projectId={projectId}
          className="opacity-0 translate-x-1 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
        />
      </div>
    </motion.div>
  );
});

export interface InlineGroupCreateProps {
  groupKey: string;
  projectId: number;
  status: string;
}

export function InlineGroupCreate({ groupKey, projectId, status }: InlineGroupCreateProps) {
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
        className="flex-1 text-xs"
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

export interface OuterGroupHeaderProps {
  groupKey: string;
  rowBy: string;
  tickets: Ticket[];
  count: number;
}

export function OuterGroupHeader({ groupKey, rowBy, tickets, count }: OuterGroupHeaderProps) {
  if (rowBy === "assignee") {
    const assigneeTicket = tickets.find((t) => t.assignee != null);
    const assignee = assigneeTicket?.assignee ?? null;
    return (
      <div className="flex items-center gap-2">
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
        <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-foreground">{groupKey}</span>
      <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
    </div>
  );
}

export interface NestedGroupProps {
  accordionValue: string;
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

export function NestedGroup({
  accordionValue,
  groupKey,
  outerGroupKey,
  items,
  groupBy,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  onTicketClick,
}: NestedGroupProps) {
  const status = getGroupStatus(groupBy, groupKey, items);
  return (
    <AccordionItem value={accordionValue} className="mb-3 border-b-0">
      <div className="mb-1.5 flex items-center gap-2 pl-1">
        <AccordionTrigger className="flex flex-1 items-center gap-2 py-0 hover:no-underline font-normal [&>svg]:ml-auto [&>svg]:size-3.5">
          <span className="text-xs font-medium text-muted-foreground">{groupKey}</span>
          <span className="text-xs text-muted-foreground tabular-nums">({items.length})</span>
        </AccordionTrigger>
        {projectId && (
          <InlineGroupCreate
            groupKey={`${outerGroupKey}/${groupKey}`}
            projectId={projectId}
            status={status}
          />
        )}
      </div>
      <AccordionContent className="pb-0">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-y divide-border">
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
      </AccordionContent>
    </AccordionItem>
  );
}

export function getGroupStatus(groupBy: string, groupKey: string, tickets: Ticket[]): string {
  if (groupBy === "status") return groupKey;
  return tickets[0]?.status ?? "TODO";
}
