"use client";

import { memo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ChevronRightIcon } from "@animateicons/react/lucide";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { getStatusDotClass } from "@/components/shared/ticket-status-badge";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlineStatus, InlinePriority, InlineAssignee, InlineEstimate } from "./card-inline-fields";
import { InlineType, InlineLabels } from "./card-inline-extra-fields";
import { InlineDueDate } from "./card-inline-date-fields";
import { pmSnappy } from "@/lib/motion-presets";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ListViewItemProps } from "./list-view-shared";
import { useCan } from "@/hooks/api/access";

export const ListViewItem = memo(function ListViewItem({
  ticket,
  projectKey,
  projectId,
  projectStatuses,
  onClick,
  displayOptions,
  dragHandleProps,
  isDragging,
  isSelected,
  onSelect,
}: ListViewItemProps) {
  const handleClick = useCallback(() => onClick(ticket.id), [onClick, ticket.id]);
  const handleSelectChange = useCallback(
    (v: boolean | "indeterminate") => {
      onSelect?.(ticket.id, v === true);
    },
    [onSelect, ticket.id],
  );
  const shouldReduceMotion = useReducedMotion();
  const { iconRef: chevronIconRef, hoverHandlers: chevronHoverHandlers } = useAnimatedIcon();
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");

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
        "group flex items-center border-b border-border/50 bg-card transition-colors hover:bg-primary/[0.04] last:border-b-0",
        isDragging && "shadow-lg ring-1 ring-primary/20 bg-primary/5 rounded-md",
      )}
      initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={pmSnappy}
      whileHover={
        isDragging || shouldReduceMotion
          ? undefined
          : { x: 1 }
      }
    >
      {onSelect !== undefined && (
        <div className="flex-shrink-0 pl-2 pr-0.5">
          <Checkbox
            checked={isSelected ?? false}
            onCheckedChange={handleSelectChange}
            aria-label={`Select ${ticket.title ?? "ticket"}`}
          />
        </div>
      )}
      {hasDragHandle && (
        <div
          {...dragHandleProps}
          className="flex-shrink-0 pl-2 pr-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="flex flex-1 min-w-0 items-center gap-2 px-3 py-1.5">
        {hasProjectId && canUpdate ? (
          <InlineStatus
            ticketId={ticket.id}
            projectId={projectId}
            currentStatus={ticket.status}
            projectStatuses={projectStatuses}
          />
        ) : (
          <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getStatusDotClass(ticket.status))} />
        )}
        {hasProjectId && canUpdate ? (
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
        {showLabels && hasProjectId && canUpdate && (
          <InlineLabels
            ticketId={ticket.id}
            projectId={projectId}
            currentLabelIds={labelIds}
          />
        )}
        {showPriority && hasProjectId && canUpdate ? (
          <InlinePriority
            ticketId={ticket.id}
            projectId={projectId}
            currentPriority={ticket.priority}
          />
        ) : showPriority && ticket.priority ? (
          <span className="text-xs font-medium flex-shrink-0 text-muted-foreground">{ticket.priority}</span>
        ) : null}
        {showEstimate && hasProjectId && canUpdate ? (
          <InlineEstimate
            ticketId={ticket.id}
            projectId={projectId}
            currentPoints={ticket.points}
          />
        ) : showEstimate && ticket.points != null && ticket.points > 0 ? (
          <Badge variant="outline" className="text-xs flex-shrink-0">{ticket.points}pt</Badge>
        ) : null}
        {showDueDate && hasProjectId && canUpdate && (
          <InlineDueDate
            ticketId={ticket.id}
            projectId={projectId}
            currentDueDate={ticket.dueDate}
          />
        )}
        {showAssignee && hasProjectId && canAssign ? (
          <InlineAssignee
            ticketId={ticket.id}
            projectId={projectId}
            currentAssigneeId={ticket.assigneeId ?? ticket.assignee?.id}
            assignee={ticket.assignee}
          />
        ) : showAssignee && ticket.assignee ? (
          <Avatar className="h-6 w-6 flex-shrink-0" title={getUserDisplayName(ticket.assignee)}>
            <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
            <AvatarFallback className="text-micro">{getUserInitials(ticket.assignee)}</AvatarFallback>
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
