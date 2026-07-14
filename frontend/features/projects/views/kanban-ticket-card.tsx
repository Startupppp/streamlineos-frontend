"use client";

import { useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import type { KanbanTicket, DisplayOptions } from "../shared/types";
import { motion, useReducedMotion } from "framer-motion";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlinePriority, InlineAssignee, InlineEstimate } from "./card-inline-fields";
import { InlineType, InlineLabels, InlineCycle } from "./card-inline-extra-fields";
import { InlineDueDate, InlineStartDate } from "./card-inline-date-fields";
import { pmSnappy, pmSpring } from "@/features/projects/shared/pm-motion";
import { TEXT_TWO_LINES } from "@/features/projects/shared/text-overflow";

interface KanbanTicketCardProps {
  ticket: KanbanTicket;
  projectId?: number;
  projectKey?: string;
  isDragging: boolean;
  dragStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onSelect: (id: number) => void;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
  index?: number;
}

export const KanbanTicketCard = memo(function KanbanTicketCard({
  ticket,
  projectId,
  projectKey,
  isDragging,
  dragStartRef,
  onSelect,
  displayOptions,
  index = 0,
}: KanbanTicketCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [dragStartRef],
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
    [ticket.id, onSelect, dragStartRef],
  );

  const ticketKey = projectKey
    ? `${projectKey}-${ticket.ticketNumber}`
    : `#${ticket.ticketNumber ?? ""}`;

  const primaryAssignee = ticket.assignees?.[0]?.user ?? ticket.assignee ?? null;

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
      layout={!shouldReduceMotion}
      layoutId={shouldReduceMotion ? undefined : `ticket-${ticket.id}`}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
      animate={
        isDragging
          ? shouldReduceMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, y: 0, scale: 1.03, rotate: 0.6 }
          : shouldReduceMotion
            ? { opacity: 1 }
            : { opacity: 1, y: 0, scale: 1, rotate: 0 }
      }
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
      whileHover={
        shouldReduceMotion || isDragging
          ? undefined
          : { y: -1, transition: pmSnappy }
      }
      whileTap={shouldReduceMotion || isDragging ? undefined : { scale: 0.985 }}
      transition={
        shouldReduceMotion
          ? { duration: 0.12 }
          : {
              ...pmSpring,
              delay: Math.min(index * 0.02, 0.16),
              layout: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
            }
      }
      className={cn(
        "group relative rounded-md border border-border/80 bg-card px-2.5 py-2",
        "cursor-grab active:cursor-grabbing will-change-transform",
        "before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full",
        "before:bg-transparent before:transition-colors before:duration-150",
        "hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-md hover:before:bg-primary/60",
        isDragging &&
          "z-20 border-primary/30 bg-card shadow-xl ring-1 ring-primary/25 before:bg-primary",
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
        <p className={cn(TEXT_TWO_LINES, "flex-1 text-[12.5px] font-medium leading-snug text-foreground/95")}>
          {ticket.title}
        </p>
        <TicketQuickActions
          ticketId={ticket.id}
          projectId={projectId}
          className="-mr-1 -mt-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 translate-x-1"
        />
      </div>

      <div className="mt-1.5 flex min-w-0 items-center justify-between gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {showId ? (
            <span className="shrink-0 font-mono text-[10px] tracking-tight text-muted-foreground/80">
              {ticketKey}
            </span>
          ) : null}

          {showPriority && projectId ? (
            <InlinePriority
              ticketId={ticket.id}
              projectId={projectId}
              currentPriority={ticket.priority}
            />
          ) : null}

          {showLabels && projectId ? (
            <InlineLabels
              ticketId={ticket.id}
              projectId={projectId}
              currentLabelIds={
                ticket.labels?.flatMap((l) => (l.label ? [l.label.id] : [])) ?? []
              }
            />
          ) : null}

          {showEstimate && projectId ? (
            <InlineEstimate
              ticketId={ticket.id}
              projectId={projectId}
              currentPoints={points}
            />
          ) : null}

          {showCycle && projectId ? (
            <InlineCycle
              ticketId={ticket.id}
              projectId={projectId}
              currentCycleId={ticket.cycleId}
            />
          ) : null}

          {showDueDate && projectId ? (
            <InlineDueDate
              ticketId={ticket.id}
              projectId={projectId}
              currentDueDate={ticket.dueDate}
            />
          ) : null}

          {projectId ? (
            <InlineStartDate
              ticketId={ticket.id}
              projectId={projectId}
              currentStartDate={ticket.startDate}
            />
          ) : null}
        </div>

        {showAssignee && projectId ? (
          <div className="ml-1 shrink-0 transition-transform duration-150 group-hover:scale-105">
            <InlineAssignee
              ticketId={ticket.id}
              projectId={projectId}
              currentAssigneeId={ticket.assigneeId ?? primaryAssignee?.id ?? null}
              assignee={primaryAssignee}
            />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
});
