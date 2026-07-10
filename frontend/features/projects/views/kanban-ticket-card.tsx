"use client";

import { useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import type { KanbanTicket, DisplayOptions } from "../shared/types";
import { motion } from "framer-motion";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlinePriority, InlineAssignee, InlineEstimate } from "./card-inline-fields";
import { InlineType, InlineLabels, InlineCycle } from "./card-inline-extra-fields";
import { InlineDueDate, InlineStartDate } from "./card-inline-date-fields";

interface KanbanTicketCardProps {
  ticket: KanbanTicket;
  projectId?: number;
  projectKey?: string;
  isDragging: boolean;
  dragStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onSelect: (id: number) => void;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
}

export const KanbanTicketCard = memo(function KanbanTicketCard({
  ticket,
  projectId,
  projectKey,
  isDragging,
  dragStartRef,
  onSelect,
  projectStatuses,
  displayOptions,
}: KanbanTicketCardProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [dragStartRef]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragStartRef.current) {
        const moved =
          Math.abs(e.clientX - dragStartRef.current.x) > 5 ||
          Math.abs(e.clientY - dragStartRef.current.y) > 5;
        dragStartRef.current = null;
        if (!moved) onSelect(ticket.id);
      } else {
        onSelect(ticket.id);
      }
    },
    [ticket.id, onSelect, dragStartRef]
  );

  const ticketKey = projectKey
    ? `${projectKey}-${ticket.ticketNumber}`
    : `#${ticket.ticketNumber ?? ticket.id}`;

  const primaryAssignee =
    ticket.assignees?.[0]?.user ?? ticket.assignee ?? null;

  const showId = displayOptions?.showId ?? true;
  const showPriority = displayOptions?.showPriority ?? true;
  const showAssignee = displayOptions?.showAssignee ?? true;
  const showEstimate = displayOptions?.showEstimate ?? true;
  const showCycle = displayOptions?.showCycle ?? true;
  const showLabels = displayOptions?.showLabels ?? true;
  const showDueDate = displayOptions?.showDueDate ?? true;

  const points = ticket.points ?? ticket.storyPoints;

  return (
    <motion.div
      layoutId={`ticket-${ticket.id}`}
      className={cn(
        "group rounded-lg border bg-card px-3 py-2.5",
        "transition-[box-shadow,border-color] duration-150 ease-out motion-reduce:transition-none",
        "cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-primary/20",
        isDragging && "shadow-xl ring-1 ring-primary/20 scale-[1.02]"
      )}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="flex items-start gap-1.5">
        {projectId ? (
          <div className="mt-0.5 shrink-0">
            <InlineType
              ticketId={ticket.id}
              projectId={projectId}
              currentType={ticket.type}
            />
          </div>
        ) : null}
        <p className="text-[13px] font-medium leading-snug line-clamp-2 flex-1">
          {ticket.title}
        </p>
        <TicketQuickActions
          ticketId={ticket.id}
          projectId={projectId}
          currentStatus={ticket.status}
          currentPriority={ticket.priority}
          currentAssigneeId={ticket.assigneeId ?? ticket.assignees?.[0]?.user?.id ?? ticket.assignee?.id}
          currentType={ticket.type}
          currentLabelIds={ticket.labels?.flatMap((l) => (l.label ? [l.label.id] : [])) ?? []}
          currentCycleId={ticket.cycleId}
          currentSprintId={ticket.sprintId}
          projectStatuses={projectStatuses}
          className="opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 -mr-1"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {showId && (
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {ticketKey}
            </span>
          )}

          {showPriority && projectId && (
            <InlinePriority
              ticketId={ticket.id}
              projectId={projectId}
              currentPriority={ticket.priority}
            />
          )}

          {showLabels && projectId && (
            <InlineLabels
              ticketId={ticket.id}
              projectId={projectId}
              currentLabelIds={ticket.labels?.flatMap((l) => (l.label ? [l.label.id] : [])) ?? []}
            />
          )}

          {showEstimate && projectId && (
            <InlineEstimate
              ticketId={ticket.id}
              projectId={projectId}
              currentPoints={points}
            />
          )}

          {showCycle && projectId && (
            <InlineCycle
              ticketId={ticket.id}
              projectId={projectId}
              currentCycleId={ticket.cycleId}
            />
          )}

          {showDueDate && projectId && (
            <InlineDueDate
              ticketId={ticket.id}
              projectId={projectId}
              currentDueDate={ticket.dueDate}
            />
          )}

          {projectId && (
            <InlineStartDate
              ticketId={ticket.id}
              projectId={projectId}
              currentStartDate={ticket.startDate}
            />
          )}
        </div>

        {showAssignee && projectId && (
          <div className="shrink-0 ml-1">
            <InlineAssignee
              ticketId={ticket.id}
              projectId={projectId}
              currentAssigneeId={ticket.assigneeId ?? primaryAssignee?.id ?? null}
              assignee={primaryAssignee}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
});
