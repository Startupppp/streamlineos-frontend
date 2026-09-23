"use client";

import {
  useState,
  useMemo,
  memo,
  useCallback,
  type ComponentType,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import type { FilterState, MemberCapacityData, StatFilter } from "./workload-types";
import { hasActiveWorkloadFilters, isMemberOverCapacity } from "./workload-types";
import Link from "next/link";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";

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
  onFilterChange: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  onClearFilters: () => void;
  capacityByMemberId?: Map<string, MemberCapacityData>;
}

function applyTicketFilters(
  tickets: KanbanTicket[],
  filters: FilterState,
): KanbanTicket[] {
  let result = tickets;
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

interface WorkloadStat {
  id: StatFilter;
  label: string;
  icon: ComponentType<{ className?: string }>;
  bg: string;
  text: string;
}

const STATS: readonly WorkloadStat[] = [
  {
    id: "all",
    label: "Total Tickets",
    icon: TrendingUp,
    bg: "bg-primary/10",
    text: "text-primary",
  },
  {
    id: "assigned",
    label: "Assigned",
    icon: CheckCircle2,
    bg: "bg-status-success-surface",
    text: "text-status-success-ink",
  },
  {
    id: "unassigned",
    label: "Unassigned",
    icon: Users,
    bg: "bg-status-warning-surface",
    text: "text-status-warning-ink",
  },
  {
    id: "over-capacity",
    label: "Over Capacity",
    icon: AlertTriangle,
    bg: "bg-status-danger-surface",
    text: "text-status-danger-ink",
  },
];

interface StatButtonProps {
  stat: WorkloadStat;
  value: number;
  isActive: boolean;
  onToggle: (id: StatFilter) => void;
}

function StatButton({ stat, value, isActive, onToggle }: StatButtonProps) {
  function handleClick() {
    onToggle(stat.id);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "bg-card rounded-lg border border-border p-3 flex h-full items-center gap-3 shadow-sm text-left transition-colors hover:bg-muted/40",
        isActive && stat.id !== "all" && "ring-2 ring-primary/30 bg-primary/5",
      )}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
          stat.bg,
        )}
      >
        <stat.icon className={cn("h-4 w-4", stat.text)} />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground tabular-nums">
          {value}
        </p>
        <p className="text-dense text-muted-foreground">{stat.label}</p>
      </div>
    </button>
  );
}

export const WorkloadView = memo(function WorkloadView({
  tickets,
  members,
  projectId,
  projectKey,
  filters,
  onFilterChange,
  onClearFilters,
  capacityByMemberId,
}: WorkloadViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set(),
  );
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => addDays(today, i));
  }, []);

  const filteredTickets = useMemo(
    () => applyTicketFilters(tickets, filters),
    [tickets, filters],
  );

  const memberWorkload = useMemo(() => {
    let memberList = members;
    if (filters.statCard === "over-capacity") {
      memberList = members.filter((m) => {
        const count = filteredTickets.filter(
          (t) => t.assigneeId === m.id,
        ).length;
        return isMemberOverCapacity(count, capacityByMemberId?.get(m.id));
      });
    }
    if (filters.assigneeId !== "all") {
      memberList = memberList.filter((m) => m.id === filters.assigneeId);
    }
    return memberList.map((member) => {
      const memberTickets = filteredTickets.filter(
        (t) => t.assigneeId === member.id,
      );
      const ticketsByDay = days.map((day) => {
        const count = memberTickets.filter((t) =>
          ticketMatchesDay(t, day),
        ).length;
        return { day, count };
      });
      const total = memberTickets.length;
      const overdue = memberTickets.filter(isTicketOverdue).length;
      const points = memberTickets.reduce((sum, t) => sum + (t.points ?? 0), 0);
      return { member, memberTickets, ticketsByDay, total, overdue, points };
    });
  }, [members, filteredTickets, days, filters.statCard, filters.assigneeId, capacityByMemberId]);

  const unassigned = useMemo(
    () => filteredTickets.filter((t) => !t.assigneeId),
    [filteredTickets],
  );
  const totalAssigned = useMemo(
    () => filteredTickets.filter((t) => !!t.assigneeId).length,
    [filteredTickets],
  );
  const overCapacityCount = memberWorkload.filter((m) =>
    isMemberOverCapacity(m.total, capacityByMemberId?.get(m.member.id)),
  ).length;

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

  const handleToggleUnassigned = useCallback(
    () => handleToggleExpand("__unassigned__"),
    [handleToggleExpand],
  );

  function handleUnassignedKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleToggleUnassigned();
  }

  function handleStatCardToggle(id: StatFilter) {
    onFilterChange("statCard", filters.statCard === id ? "all" : id);
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
          <StatButton
            key={stat.id}
            stat={stat}
            value={statValues[stat.id]}
            isActive={filters.statCard === stat.id}
            onToggle={handleStatCardToggle}
          />
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="flex min-h-full min-w-max flex-col">
            <div className="sticky top-0 z-10 flex shrink-0 border-b bg-secondary">
              <div className="w-52 shrink-0 px-4 py-2.5 text-micro font-bold text-muted-foreground uppercase tracking-wider">
                Member
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-bold text-muted-foreground text-center">
                Tickets
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-bold text-muted-foreground text-center">
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
                  <p className="text-micro font-bold text-muted-foreground uppercase tracking-wider">
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={cn(
                      "text-dense",
                      isSameDay(day, new Date())
                        ? "text-primary font-bold"
                        : "text-muted-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>

            {memberWorkload.length === 0 && !showUnassignedRow ? (
              <EmptyState
                className="flex-1"
                illustrationPreset="team"
                title="No workload to show"
                description="No team members have assigned tickets in this project."
                filtersActive={hasActiveFilters}
                filteredTitle="No members match your filters"
                onClearFilters={onClearFilters}
              />
            ) : (
              memberWorkload.map(
                (
                  {
                    member,
                    memberTickets,
                    ticketsByDay,
                    total,
                    overdue,
                    points,
                  },
                  idx,
                ) => (
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
                    capacityData={capacityByMemberId?.get(member.id)}
                  />
                ),
              )
            )}

            {showUnassignedRow && (
              <motion.div
                initial={
                  shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }
                }
                animate={
                  shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
                }
                transition={{
                  delay: memberWorkload.length * 0.04,
                  duration: 0.2,
                  ease: "easeOut",
                }}
              >
                <div
                  className={cn(
                    "flex items-center border-b cursor-pointer hover:bg-muted/30 transition-colors bg-muted/20",
                    expandedMembers.has("__unassigned__") &&
                      "bg-status-warning-surface",
                  )}
                  role="button"
                  onClick={handleToggleUnassigned}
                  onKeyDown={handleUnassignedKeyDown}
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
                    <span className="text-sm text-muted-foreground">
                      Unassigned
                    </span>
                  </div>
                  <div className="w-20 shrink-0 px-2 py-3 text-center">
                    <span className="text-sm font-semibold text-status-warning-ink">
                      {unassigned.length}
                    </span>
                  </div>
                  <div className="w-20 shrink-0 px-2 py-3 text-center">
                    <span className="text-sm text-muted-foreground">—</span>
                  </div>
                </div>

                {unassigned.length > 0 && (
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] ease-in-out",
                      shouldReduceMotion ? "duration-0" : "duration-200",
                      expandedMembers.has("__unassigned__")
                        ? "grid-rows-[1fr]"
                        : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden bg-status-warning-surface">
                      {unassigned.slice(0, 10).map((ticket) => (
                        <div
                          key={ticket.id}
                          className="group/unassigned flex min-w-0 items-center gap-2 border-b border-border/40 px-8 py-2"
                        >
                          <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                            #{ticket.ticketNumber}
                          </span>
                          <TruncatedText
                            text={ticket.title}
                            className="min-w-0 flex-1 text-xs text-foreground"
                          />
                          {ticket.points != null && (
                            <span className="shrink-0 text-micro tabular-nums text-muted-foreground">
                              {ticket.points}pt
                            </span>
                          )}
                          <Link
                            href={
                              ticket.ticketNumber != null
                                ? getTicketDetailHref(
                                    projectId,
                                    projectKey,
                                    ticket.ticketNumber,
                                  )
                                : `/build/${projectId}`
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
                            onKeyDown={stopEvent}
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
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
