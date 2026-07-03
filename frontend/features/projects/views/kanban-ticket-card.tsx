"use client";

import { useCallback, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { PriorityBadge } from "../shared/priority-badge";
import type { KanbanTicket } from "../shared/types";
import { motion } from "framer-motion";

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
  projectKey?: string;
  isDragging: boolean;
  dragStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onSelect: (id: number) => void;
}

export const KanbanTicketCard = memo(function KanbanTicketCard({
  ticket,
  projectKey,
  isDragging,
  dragStartRef,
  onSelect,
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

  const dueState = ticket.status === "DONE" ? null : getDueState(ticket.dueDate);
  const dueLabel = ticket.dueDate
    ? new Date(ticket.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <motion.div
      layoutId={`ticket-${ticket.id}`}
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5 transition-shadow",
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
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            {ticketKey}
          </span>
          <PriorityBadge priority={ticket.priority} />

          {ticket.labels && ticket.labels.length > 0 && (
            <div className="flex items-center gap-0.5">
              {ticket.labels.slice(0, 3).map(({ label }) =>
                label ? (
                  <span
                    key={label.id}
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: label.color || "#3b82f6" }}
                    title={label.name}
                  />
                ) : null
              )}
              {ticket.labels.length > 3 && (
                <span className="text-[9px] text-muted-foreground ml-0.5">
                  +{ticket.labels.length - 3}
                </span>
              )}
            </div>
          )}

          {(ticket.points ?? ticket.storyPoints) != null &&
            (ticket.points ?? ticket.storyPoints)! > 0 && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1 py-0 h-4 font-mono"
              >
                {ticket.points ?? ticket.storyPoints}
              </Badge>
            )}

          {dueState && dueLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums",
                dueState === "overdue" && "text-destructive",
                dueState === "soon" && "text-amber-600",
                dueState === "future" && "text-muted-foreground"
              )}
              title={`Due ${dueLabel}`}
            >
              <CalendarClock className="h-3 w-3 shrink-0" />
              {dueLabel}
            </span>
          )}
        </div>

        {primaryAssignee ? (
          <Avatar className="h-5 w-5 border border-background shrink-0">
            <AvatarImage src={resolveImageUrl(primaryAssignee.image)} />
            <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-medium">
              {primaryAssignee.firstName?.[0]}
              {primaryAssignee.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-5 w-5 rounded-full bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
            <span className="text-[7px] text-muted-foreground">?</span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export type { KanbanTicket, KanbanColumn } from "../shared/types";
