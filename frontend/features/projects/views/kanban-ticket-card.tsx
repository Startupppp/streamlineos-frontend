"use client";

import { useCallback, memo } from "react";
import { CalendarClock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import type { KanbanTicket, DisplayOptions } from "../shared/types";
import { motion } from "framer-motion";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlinePriority, InlineAssignee, InlineEstimate } from "./card-inline-fields";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

function getDueState(dueDate?: string | null): "overdue" | "soon" | "future" | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 1) return "soon";
  return "future";
}

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const handleLabelChipClick = useCallback(
    (labelId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      const existing = params.get("labels") ?? "";
      const ids = new Set(existing.split(",").filter(Boolean));
      ids.add(String(labelId));
      params.set("labels", [...ids].join(","));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleCycleChipClick = useCallback(
    (cycleId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      params.set("cycle", String(cycleId));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const ticketKey = projectKey
    ? `${projectKey}-${ticket.ticketNumber}`
    : `#${ticket.ticketNumber ?? ticket.id}`;

  const primaryAssignee =
    ticket.assignees?.[0]?.user ?? ticket.assignee ?? null;

  const dueState = ticket.status === "DONE" ? null : getDueState(ticket.dueDate);
  const dueLabel = ticket.dueDate
    ? new Date(ticket.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

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
        "group rounded-lg border bg-card px-3 py-2.5 transition-shadow",
        "cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-border/80",
        isDragging && "shadow-xl ring-1 ring-primary/20 scale-[1.02]"
      )}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="flex items-start gap-1.5">
        <TicketTypeIcon type={ticket.type} className="mt-0.5 shrink-0" />
        <p className="text-[13px] font-medium leading-snug line-clamp-2 flex-1">
          {ticket.title}
        </p>
        <TicketQuickActions
          ticketId={ticket.id}
          projectId={projectId}
          currentStatus={ticket.status}
          currentPriority={ticket.priority}
          currentAssigneeId={ticket.assigneeId ?? ticket.assignees?.[0]?.user?.id ?? ticket.assignee?.id}
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

          {showLabels && ticket.labels && ticket.labels.length > 0 && (
            <div className="flex items-center gap-0.5 shrink-0">
              {ticket.labels.slice(0, 3).map(({ label }) =>
                label ? (
                  <HoverCard key={label.id} openDelay={300} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        className="h-2 w-2 rounded-full shrink-0 hover:scale-125 transition-transform"
                        style={{ backgroundColor: label.color || "#3b82f6" }}
                        onClick={(e) => handleLabelChipClick(label.id, e)}
                        onMouseDown={stopEvent}
                        aria-label={label.name}
                      />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-auto min-w-[120px] p-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: label.color || "#3b82f6" }}
                        />
                        <span className="text-xs font-medium">{label.name}</span>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ) : null
              )}
              {ticket.labels.length > 3 && (
                <span className="text-[9px] text-muted-foreground ml-0.5">
                  +{ticket.labels.length - 3}
                </span>
              )}
            </div>
          )}

          {showEstimate && projectId && (
            <InlineEstimate
              ticketId={ticket.id}
              projectId={projectId}
              currentPoints={points}
            />
          )}

          {showCycle && ticket.cycle && (
            <HoverCard openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 transition-colors shrink-0"
                  onClick={(e) => handleCycleChipClick(ticket.cycle!.id, e)}
                  onMouseDown={stopEvent}
                  aria-label={ticket.cycle.name}
                >
                  <RotateCcw className="h-2.5 w-2.5 shrink-0" />
                  <span className="max-w-[60px] truncate">{ticket.cycle.name}</span>
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-52 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <RotateCcw className="h-3.5 w-3.5 text-violet-500" />
                  {ticket.cycle.name}
                </div>
                <p className="text-[10px] text-muted-foreground capitalize">{ticket.cycle.status}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(ticket.cycle.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {" — "}
                  {new Date(ticket.cycle.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </HoverCardContent>
            </HoverCard>
          )}

          {showDueDate && dueState && dueLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums shrink-0",
                dueState === "overdue" && "text-destructive",
                dueState === "soon" && "text-amber-600",
                dueState === "future" && "text-muted-foreground"
              )}
            >
              <CalendarClock className="h-3 w-3 shrink-0" />
              {dueLabel}
            </span>
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

function stopEvent(e: React.MouseEvent) {
  e.stopPropagation();
}
