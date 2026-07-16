"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isSameDay, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { KanbanTicket } from "../shared/types";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { stopEvent, InlineAssignee } from "./card-inline-fields";
import { TicketQuickActions } from "./ticket-quick-actions";
import { getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";
import { TruncatedText } from "@/components/ui/truncated-text";

interface WorkloadMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
}

interface WorkloadMemberRowProps {
  member: WorkloadMember;
  memberTickets: KanbanTicket[];
  ticketsByDay: { day: Date; count: number }[];
  total: number;
  overdue: number;
  points: number;
  days: Date[];
  projectId: number;
  projectKey?: string | null;
  expanded: boolean;
  motionDelay: number;
  reducedMotion: boolean | null;
  onToggle: (id: string) => void;
}

function getUtilizationClass(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (count <= 4) return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
}

export const WorkloadMemberRow = memo(function WorkloadMemberRow({
  member,
  memberTickets,
  ticketsByDay,
  total,
  overdue,
  points,
  days,
  projectId,
  projectKey,
  expanded,
  motionDelay,
  reducedMotion,
  onToggle,
}: WorkloadMemberRowProps) {
  const displayName = getUserDisplayName(member);

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ delay: motionDelay, duration: 0.2, ease: "easeOut" }}
    >
      <div
        className={cn(
          "flex items-center border-b cursor-pointer hover:bg-muted/30 transition-colors",
          expanded && "bg-muted/40",
          total > 5 && "border-l-2 border-l-red-400",
        )}
        role="button"
        onClick={() => onToggle(member.id)}
        onKeyDown={(e) => e.key === "Enter" && onToggle(member.id)}
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="w-52 shrink-0 px-4 py-3 flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={resolveImageUrl(member.image)} />
            <AvatarFallback className="text-[9px]">{getUserInitials(member)}</AvatarFallback>
          </Avatar>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-medium truncate">{displayName}</span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{displayName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {overdue > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-auto h-4 w-4 rounded-full bg-red-100 text-red-700 text-[9px] flex items-center justify-center font-bold shrink-0 dark:bg-red-500/20 dark:text-red-300">
                    {overdue}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{overdue} overdue ticket{overdue !== 1 ? "s" : ""}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="w-20 shrink-0 px-2 py-3 text-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    total > 5 ? "text-red-600 dark:text-red-400" : total > 3 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                  )}
                >
                  {total}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {total > 5
                    ? "Over suggested capacity (5 tickets). Configure member capacity to track precisely."
                    : `${total} ticket${total !== 1 ? "s" : ""} assigned`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="w-20 shrink-0 px-2 py-3 text-center">
          <span className="text-sm text-muted-foreground tabular-nums">
            {points > 0 ? points : "—"}
          </span>
        </div>

        {ticketsByDay.map(({ count }, i) => (
          <div
            key={i}
            className={cn(
              "w-12 shrink-0 px-1 py-3 flex items-center justify-center",
              isSameDay(days[i]!, new Date()) && "bg-primary/5",
            )}
          >
            {count > 0 && (
              <span
                className={cn(
                  "h-5 w-5 rounded text-[10px] font-semibold flex items-center justify-center",
                  getUtilizationClass(count),
                )}
              >
                {count}
              </span>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {expanded && memberTickets.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-muted/20"
          >
            {memberTickets.slice(0, 10).map((ticket) => (
              <div
                key={ticket.id}
                className="group/workload flex items-center border-b border-border/40 px-8 py-2 gap-2"
              >
                <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">
                  #{ticket.ticketNumber}
                </span>
                <TruncatedText text={ticket.title} className="flex-1 text-xs text-foreground" />
                {ticket.points != null && (
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {ticket.points}pt
                  </span>
                )}
                {ticket.dueDate && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    Due {format(parseISO(ticket.dueDate), "MMM d")}
                  </span>
                )}
                <Link
                  href={
                    ticket.ticketNumber != null
                      ? getTicketDetailHref(projectId, projectKey, ticket.ticketNumber)
                      : `/projects/${projectId}`
                  }
                  onMouseDown={stopEvent}
                  onClick={stopEvent}
                  className="shrink-0 opacity-0 group-hover/workload:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                  aria-label="Open ticket"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
                <span
                  onMouseDown={stopEvent}
                  onClick={stopEvent}
                  className="shrink-0 opacity-0 group-hover/workload:opacity-100 transition-opacity"
                >
                  <InlineAssignee
                    ticketId={ticket.id}
                    projectId={projectId}
                    currentAssigneeId={ticket.assigneeId}
                    assignee={ticket.assignee}
                  />
                </span>
                <span
                  onMouseDown={stopEvent}
                  onClick={stopEvent}
                  className="shrink-0 opacity-0 group-hover/workload:opacity-100 transition-opacity"
                >
                  <TicketQuickActions ticketId={ticket.id} projectId={projectId} />
                </span>
              </div>
            ))}
            {memberTickets.length > 10 && (
              <div className="px-8 py-1.5 text-xs text-muted-foreground">
                +{memberTickets.length - 10} more tickets
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
