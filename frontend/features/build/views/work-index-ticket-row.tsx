"use client";

import { memo, useCallback } from "react";
import { Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { formatCalendarDate } from "@/lib/date-utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { cn, resolveImageUrl } from "@/lib/utils";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import type { ListViewItemProps } from "./list-view-shared";

export const WorkIndexTicketRow = memo(function WorkIndexTicketRow({
  ticket,
  projectKey,
  onClick,
  displayOptions,
  isSelected,
  onSelect,
  isKeyboardFocused,
}: ListViewItemProps) {
  const handleOpen = useCallback(
    () => onClick(ticket.id),
    [onClick, ticket.id],
  );
  const handleSelect = useCallback(
    (checked: boolean | "indeterminate") => {
      onSelect?.(ticket.id, checked === true);
    },
    [onSelect, ticket.id],
  );
  const assignee =
    ticket.assignees?.find((entry) => entry.user)?.user ?? ticket.assignee;
  const assigneeName = assignee ? getUserDisplayName(assignee) : "Unassigned";

  return (
    <div
      data-keyboard-focused={isKeyboardFocused ? "true" : undefined}
      className={cn(
        "group flex min-w-0 items-center gap-2 border-b border-border/50 bg-card px-3 py-2 last:border-b-0 hover:bg-muted/50",
        isKeyboardFocused && "ring-1 ring-inset ring-primary/40",
      )}
    >
      {onSelect ? (
        <Checkbox
          checked={isSelected ?? false}
          onCheckedChange={handleSelect}
          aria-label={`Select ${ticket.title}`}
        />
      ) : null}
      <TooltipProvider delayDuration={200}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 md:flex-nowrap">
          {(displayOptions?.showId ?? true) ? (
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {formatTicketKey(
                projectKey ?? ticket.project?.key,
                ticket.ticketNumber,
                ticket.sequenceId ?? undefined,
              )}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleOpen}
            aria-label={`Open ${ticket.title}`}
            className="min-w-0 flex-1 basis-1/2 truncate text-left text-sm font-medium hover:underline md:basis-0"
            title={ticket.title}
          >
            {ticket.title}
          </button>
          <span
            className="max-w-32 truncate text-xs text-muted-foreground"
            title={ticket.project?.name}
          >
            {ticket.project?.name}
          </span>
          <StatusBadge status={ticket.status} compact />
          {(displayOptions?.showPriority ?? true) && ticket.priority ? (
            <span aria-label={`Priority: ${ticket.priority}`}>
              <PriorityBadge priority={ticket.priority} />
            </span>
          ) : null}
          {(displayOptions?.showDueDate ?? true) && ticket.dueDate ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground"
              aria-label={`Due ${formatCalendarDate(ticket.dueDate)}`}
            >
              <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
              {formatCalendarDate(ticket.dueDate)}
            </span>
          ) : null}
          {(displayOptions?.showAssignee ?? true) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  role="img"
                  aria-label={`Assignee: ${assigneeName}`}
                  className="shrink-0"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={
                        assignee ? resolveImageUrl(assignee.image) : undefined
                      }
                      alt=""
                    />
                    <AvatarFallback className="text-micro">
                      {assignee ? getUserInitials(assignee) : "—"}
                    </AvatarFallback>
                  </Avatar>
                </span>
              </TooltipTrigger>
              <TooltipContent>{assigneeName}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </TooltipProvider>
    </div>
  );
});
