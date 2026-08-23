"use client";

import { memo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ChevronRightIcon } from "@animateicons/react/lucide";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { getStatusDotClass } from "../shared/status-badge";
import { formatTicketKey } from "../shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlineStatus, InlinePriority, InlineAssignee, InlineEstimate } from "./card-inline-fields";
import { InlineType, InlineLabels } from "./card-inline-extra-fields";
import { InlineDueDate } from "./card-inline-date-fields";
import { pmSnappy } from "@/lib/motion-presets";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ListViewItemProps } from "./list-view-shared";

export const ListViewItem = memo(function ListViewItem({
  ticket,
  projectKey,
  projectId,
  projectStatuses,
  onClick,
  displayOptions,
  dragHandleProps,
  isDragging,
}: ListViewItemProps) {
  const handleClick = useCallback(() => onClick(ticket.id), [onClick, ticket.id]);
  const shouldReduceMotion = useReducedMotion();
  const { iconRef: chevronIconRef, hoverHandlers: chevronHoverHandlers } = useAnimatedIcon();

  const showId = displayOptions?.showId ?? true;
  const showPriority = displayOptions?.showPriority ?? true;
  const showAssignee = displayOptions?.showAssignee ?? true;
  const showEstimate = displayOptions?.showEstimate ?? true;
  const showLabels = displayOptions?.showLabels ?? true;
  const showDueDate = displayOptions?.showDueDate ?? true;

  const labelIds = ticket.labels
    ?.map((l) => l.label?.id)
    .filter((v): v is number => v != null) ?? [];

  const hasProjectId = projectId != null;
  const hasDragHandle = dragHandleProps != null;

  return (
    <motion.div
      className={cn(
        "group flex items-center border-b border-border/50 bg-card last:border-b-0",
        isDragging && "shadow-lg ring-1 ring-primary/20 bg-primary/5 rounded-md",
      )}
      initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={pmSnappy}
      whileHover={
        isDragging || shouldReduceMotion
          ? undefined
          : { backgroundColor: "color-mix(in srgb, var(--primary) 4%, transparent)", x: 1 }
      }
    >
      {hasDragHandle && (
        <div
          {...dragHandleProps}
          className="flex-shrink-0 pl-2 pr-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
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
          className="min-w-0 flex-1 overflow-hidden text-left text-sm text-foreground hover:underline underline-offset-2"
        >
          <TruncatedText text={ticket.title} />
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
        {showDueDate && hasProjectId && (
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
          {...chevronHoverHandlers}
        >
          <ChevronRightIcon ref={chevronIconRef} size={16} />
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

export type { ListViewItemProps };
