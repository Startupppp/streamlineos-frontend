"use client";

import { useState, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanTicket } from "../shared/types";
import { stopEvent, InlineAssignee } from "./card-inline-fields";
import { WorkloadMemberRow } from "./workload-member-row";
import type { FilterState, StatFilter } from "./workload-types";
import { hasActiveWorkloadFilters } from "./workload-types";
import Link from "next/link";
import { getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";
import { TruncatedText } from "@/components/ui/truncated-text";

interface WorkloadMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
}

interface WorkloadViewProps {
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string | null;
  members: WorkloadMember[];
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

function applyTicketFilters(tickets: KanbanTicket[], filters: FilterState): KanbanTicket[] {
  let result = tickets;
  if (filters.sprintId !== "all") {
    result = result.filter((t) => t.sprintId === Number(filters.sprintId));
  }
  if (filters.cycleId !== "all") {
    result = result.filter((t) => t.cycleId === Number(filters.cycleId));
  }
  if (filters.priority !== "all") {
    result = result.filter((t) => t.priority === filters.priority);
  }
  if (filters.type !== "all") {
    result = result.filter((t) => t.type === filters.type);
  }
  if (filters.status !== "all") {
    result = result.filter((t) => t.status === filters.status);
  }
  if (filters.assigneeId !== "all") {
    result = result.filter((t) => t.assigneeId === filters.assigneeId);
  }
  return result;
}

function ticketMatchesDay(ticket: KanbanTicket, day: Date): boolean {
  if (!ticket.dueDate) return false;
  try {
    return isSameDay(parseISO(ticket.dueDate), day);
  } catch {
    return false;
  }
}

function isTicketOverdue(ticket: KanbanTicket): boolean {
  if (!ticket.dueDate) return false;
  try {
    return parseISO(ticket.dueDate) < new Date() && ticket.status !== "DONE";
  } catch {
    return false;
  }
}

const STATS = [
  { id: "all" as StatFilter, label: "Total Tickets", icon: TrendingUp, bg: "bg-primary/10", text: "text-primary" },
  { id: "assigned" as StatFilter, label: "Assigned", icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  { id: "unassigned" as StatFilter, label: "Unassigned", icon: Users, bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  { id: "over-capacity" as StatFilter, label: "Over Capacity", icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600 dark:text-red-400" },
] as const;

export const WorkloadView = memo(function WorkloadView({
  tickets,
  members,
  projectId,
  projectKey,
  filters,
  onFilterChange,
}: WorkloadViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => addDays(today, i));
  }, []);

  const filteredTickets = useMemo(() => applyTicketFilters(tickets, filters), [tickets, filters]);

  const memberWorkload = useMemo(() => {
    let memberList = members;
    if (filters.statCard === "over-capacity") {
      memberList = members.filter((m) => {
        const count = filteredTickets.filter((t) => t.assigneeId === m.id).length;
        return count > 5;
      });
    }
    if (filters.assigneeId !== "all") {
      memberList = memberList.filter((m) => m.id === filters.assigneeId);
    }
    return memberList.map((member) => {
      const memberTickets = filteredTickets.filter((t) => t.assigneeId === member.id);
      const ticketsByDay = days.map((day) => {
        const count = memberTickets.filter((t) => ticketMatchesDay(t, day)).length;
        return { day, count };
      });
      const total = memberTickets.length;
      const overdue = memberTickets.filter(isTicketOverdue).length;
      const points = memberTickets.reduce((sum, t) => sum + (t.points ?? 0), 0);
      return { member, memberTickets, ticketsByDay, total, overdue, points };
    });
  }, [members, filteredTickets, days, filters.statCard, filters.assigneeId]);

  const unassigned = useMemo(
    () => filteredTickets.filter((t) => !t.assigneeId),
    [filteredTickets],
  );
  const totalAssigned = useMemo(
    () => filteredTickets.filter((t) => !!t.assigneeId).length,
    [filteredTickets],
  );
  const overCapacityCount = memberWorkload.filter((m) => m.total > 5).length;

  const statValues: Record<StatFilter, number> = {
    all: filteredTickets.length,
    assigned: totalAssigned,
    unassigned: unassigned.length,
    "over-capacity": overCapacityCount,
  };

  const handleToggleExpand = useCallback((memberId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }, []);

  function handleStatCardClick(card: StatFilter) {
    onFilterChange("statCard", filters.statCard === card ? "all" : card);
  }

  const hasActiveFilters = hasActiveWorkloadFilters(filters);

  const showUnassignedRow =
    filters.showUnassigned &&
    unassigned.length > 0 &&
    filters.statCard !== "assigned" &&
    filters.statCard !== "over-capacity";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid w-full min-w-0 shrink-0 gap-3 overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-hide grid-cols-[repeat(4,minmax(176px,1fr))]">
        {STATS.map((stat) => (
          <button
            key={stat.id}
            type="button"
            onClick={() => handleStatCardClick(stat.id)}
            className={cn(
              "bg-card rounded-lg border border-border p-3 flex h-full items-center gap-3 shadow-sm text-left transition-colors hover:bg-muted/40",
              filters.statCard === stat.id && stat.id !== "all" && "ring-2 ring-primary/30 bg-primary/5",
            )}
          >
            <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", stat.bg)}>
              <stat.icon className={cn("h-4 w-4", stat.text)} />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground tabular-nums">{statValues[stat.id]}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="flex min-h-full min-w-max flex-col">
            <div className="sticky top-0 z-10 flex shrink-0 border-b bg-muted/50">
              <div className="w-52 shrink-0 px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Member
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-[10px] font-bold text-muted-foreground text-center">
                Tickets
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-[10px] font-bold text-muted-foreground text-center">
                Points
              </div>
              {days.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-12 shrink-0 px-1 py-2.5 text-center",
                    isSameDay(day, new Date()) && "bg-primary/5",
                  )}
                >
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {format(day, "EEE")}
                  </p>
                  <p className={cn("text-[11px]", isSameDay(day, new Date()) ? "text-primary font-bold" : "text-muted-foreground")}>
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>

            {memberWorkload.length === 0 && !showUnassignedRow ? (
              <div className="flex flex-1 items-center justify-center px-4 py-12 text-center">
                <div>
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? "No members match the current filters. Try adjusting or clearing filters."
                      : "No team members with assigned tickets in this project."}
                  </p>
                </div>
              </div>
            ) : (
              memberWorkload.map(({ member, memberTickets, ticketsByDay, total, overdue, points }, idx) => (
                <WorkloadMemberRow
                  key={member.id}
                  member={member}
                  memberTickets={memberTickets}
                  ticketsByDay={ticketsByDay}
                  total={total}
                  overdue={overdue}
                  points={points}
                  days={days}
                  projectId={projectId}
                  projectKey={projectKey}
                  expanded={expandedMembers.has(member.id)}
                  motionDelay={idx * 0.04}
                  reducedMotion={shouldReduceMotion}
                  onToggle={handleToggleExpand}
                />
              ))
            )}

            {showUnassignedRow && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ delay: memberWorkload.length * 0.04, duration: 0.2, ease: "easeOut" }}
              >
                <div
                  className={cn(
                    "flex items-center border-b cursor-pointer hover:bg-muted/30 transition-colors bg-muted/20",
                    expandedMembers.has("__unassigned__") && "bg-amber-50/60 dark:bg-amber-500/10",
                  )}
                  role="button"
                  onClick={() => handleToggleExpand("__unassigned__")}
                  onKeyDown={(e) => e.key === "Enter" && handleToggleExpand("__unassigned__")}
                  tabIndex={0}
                  aria-expanded={expandedMembers.has("__unassigned__")}
                >
                  <div className="w-52 shrink-0 px-4 py-3 flex items-center gap-2">
                    {expandedMembers.has("__unassigned__") ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Users className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  </div>
                  <div className="w-20 shrink-0 px-2 py-3 text-center">
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{unassigned.length}</span>
                  </div>
                  <div className="w-20 shrink-0 px-2 py-3 text-center">
                    <span className="text-sm text-muted-foreground">—</span>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedMembers.has("__unassigned__") && unassigned.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-amber-50/30 dark:bg-amber-500/[0.05]"
                    >
                      {unassigned.slice(0, 10).map((ticket) => (
                        <div
                          key={ticket.id}
                          className="group/unassigned flex items-center border-b border-border/40 px-8 py-2 gap-2"
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
                          <Link
                            href={
                              ticket.ticketNumber != null
                                ? getTicketDetailHref(projectId, projectKey, ticket.ticketNumber)
                                : `/projects/${projectId}`
                            }
                            onMouseDown={stopEvent}
                            onClick={stopEvent}
                            className="shrink-0 opacity-0 group-hover/unassigned:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                            aria-label="Open ticket"
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </Link>
                          <span
                            onMouseDown={stopEvent}
                            onClick={stopEvent}
                            className="shrink-0 opacity-0 group-hover/unassigned:opacity-100 transition-opacity"
                          >
                            <InlineAssignee
                              ticketId={ticket.id}
                              projectId={projectId}
                              currentAssigneeId={null}
                              assignee={null}
                            />
                          </span>
                        </div>
                      ))}
                      {unassigned.length > 10 && (
                        <div className="px-8 py-1.5 text-xs text-muted-foreground">
                          +{unassigned.length - 10} more unassigned tickets
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
