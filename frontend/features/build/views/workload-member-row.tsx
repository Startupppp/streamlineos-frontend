"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { isSameDay } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { KanbanTicket } from "../shared/types";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { WorkloadTicketList } from "./workload-ticket-list";
import { isMemberOverCapacity, type MemberCapacityData } from "./workload-types";

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
  focused?: boolean;
  motionDelay: number;
  reducedMotion: boolean | null;
  onToggle: (id: string) => void;
  capacityData?: MemberCapacityData;
}

export function formatEstimateHours(capacityData: MemberCapacityData | undefined): string {
  if (capacityData == null || capacityData.estimateHours === null) return "—";
  return `${capacityData.estimateHours}h`;
}

export function formatAllocationPercent(capacityData: MemberCapacityData | undefined): string {
  if (capacityData == null || capacityData.allocationPercent === null) return "—";
  return `${capacityData.allocationPercent}%`;
}

export function formatVarianceHours(capacityData: MemberCapacityData | undefined): string {
  if (capacityData == null || capacityData.varianceHours === null) return "—";
  const variance = capacityData.varianceHours;
  return variance > 0 ? `+${variance}h` : `${variance}h`;
}

function getUtilizationClass(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-status-success-surface text-status-success-ink-strong";
  if (count <= 4) return "bg-status-warning-surface text-status-warning-ink-strong";
  return "bg-status-danger-surface text-status-danger-ink-strong";
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
  focused = false,
  motionDelay,
  reducedMotion,
  onToggle,
  capacityData,
}: WorkloadMemberRowProps) {
  const displayName = getUserDisplayName(member);
  const overCapacity = isMemberOverCapacity(total, capacityData);

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ delay: motionDelay, duration: 0.2, ease: "easeOut" }}
    >
      <div
        data-testid="workload-member-row"
        className={cn(
          "flex items-center border-b cursor-pointer hover:bg-muted/30 transition-colors",
          expanded && "bg-muted/40",
          focused && "ring-2 ring-inset ring-primary/40",
          overCapacity && "border-l-2 border-l-red-400",
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
            <AvatarFallback className="text-micro">{getUserInitials(member)}</AvatarFallback>
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
                  <span className="ml-auto h-4 w-4 rounded-full bg-status-danger-surface text-status-danger-ink-strong text-micro flex items-center justify-center font-medium shrink-0">
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
                    "text-sm font-medium",
                    overCapacity ? "text-status-danger-ink-strong" : total > 3 ? "text-status-warning-ink-strong" : "text-foreground",
                  )}
                >
                  {total}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {overCapacity
                    ? capacityData !== undefined
                      ? `${capacityData.loggedHours}h logged${capacityData.capacityHours !== null ? ` of ${capacityData.capacityHours}h capacity` : ""}${capacityData.utilizationPercent !== null ? ` (${capacityData.utilizationPercent}%)` : ""}. Over capacity.`
                      : "Over suggested capacity (5 tickets). Configure member capacity to track precisely."
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

        <div className="w-20 shrink-0 px-2 py-3 text-center">
          <span className="text-sm tabular-nums text-muted-foreground">
            {capacityData != null ? `${capacityData.leaveDays}d` : "—"}
          </span>
        </div>

        <div className="w-24 shrink-0 px-2 py-3 text-center">
          <span
            data-testid="workload-allocation"
            className={cn(
              "text-sm tabular-nums",
              capacityData?.allocationPercent != null && capacityData.allocationPercent > 100
                ? "text-status-danger-ink-strong font-medium"
                : "text-muted-foreground",
            )}
          >
            {formatAllocationPercent(capacityData)}
          </span>
        </div>

        <div className="w-24 shrink-0 px-2 py-3 text-center">
          <span
            data-testid="workload-estimate"
            className="text-sm tabular-nums text-muted-foreground"
          >
            {formatEstimateHours(capacityData)}
          </span>
        </div>

        <div className="w-20 shrink-0 px-2 py-3 text-center">
          <span className="text-sm tabular-nums text-muted-foreground">
            {capacityData != null ? `${capacityData.loggedHours}h` : "—"}
          </span>
        </div>

        <div className="w-24 shrink-0 px-2 py-3 text-center">
          <span
            data-testid="workload-variance"
            className={cn(
              "text-sm tabular-nums",
              capacityData?.varianceHours != null && capacityData.varianceHours > 0
                ? "text-status-danger-ink-strong font-medium"
                : "text-muted-foreground",
            )}
          >
            {formatVarianceHours(capacityData)}
          </span>
        </div>

        {ticketsByDay.map(({ count }, i) => {
          const day = days[i];
          return (
          <div
            key={i}
            className={cn(
              "w-12 shrink-0 px-1 py-3 flex items-center justify-center",
              day && isSameDay(day, new Date()) && "bg-primary/5",
            )}
          >
            {count > 0 && (
              <span
                className={cn(
                  "h-5 w-5 rounded text-micro font-medium flex items-center justify-center",
                  getUtilizationClass(count),
                )}
              >
                {count}
              </span>
            )}
          </div>
          );
        })}
      </div>

      <WorkloadTicketList
        memberTickets={memberTickets}
        projectId={projectId}
        projectKey={projectKey}
        expanded={expanded}
        reducedMotion={reducedMotion}
      />
    </motion.div>
  );
});
