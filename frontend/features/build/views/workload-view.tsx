"use client";

import {
  useState,
  useMemo,
  memo,
  useCallback,
  type ComponentType,
} from "react";
import { useReducedMotion } from "framer-motion";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { Users, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanTicket } from "../shared/types";
import { isCompletedTicketStatus } from "../shared/completed-status";
import { WorkloadMemberRow } from "./workload-member-row";
import { WorkloadUnassignedRow } from "./workload-unassigned-row";
import type { FilterState, MemberCapacityData, StatFilter } from "./workload-types";
import { hasActiveWorkloadFilters, isMemberOverCapacity } from "./workload-types";
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
  projectStatuses?: Array<{ name: string; type?: string | null }>;
  members: WorkloadMember[];
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  onClearFilters: () => void;
  capacityByMemberId?: Map<string, MemberCapacityData>;
  focusedMemberId?: string | null;
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

function isTicketOverdue(ticket: KanbanTicket, statuses?: Array<{ name: string; type?: string | null }>): boolean {
  if (!ticket.dueDate) return false;
  try {
    return parseISO(ticket.dueDate) < new Date() && !isCompletedTicketStatus(ticket.status, statuses);
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
    text: "text-status-success-ink-strong",
  },
  {
    id: "unassigned",
    label: "Unassigned",
    icon: Users,
    bg: "bg-status-warning-surface",
    text: "text-status-warning-ink-strong",
  },
  {
    id: "over-capacity",
    label: "Over Capacity",
    icon: AlertTriangle,
    bg: "bg-status-danger-surface",
    text: "text-status-danger-ink-strong",
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
  projectStatuses,
  filters,
  onFilterChange,
  onClearFilters,
  capacityByMemberId,
  focusedMemberId = null,
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
      const overdue = memberTickets.filter((t) => isTicketOverdue(t, projectStatuses)).length;
      const points = memberTickets.reduce((sum, t) => sum + (t.points ?? 0), 0);
      return { member, memberTickets, ticketsByDay, total, overdue, points };
    });
  }, [members, filteredTickets, days, filters.statCard, filters.assigneeId, capacityByMemberId, projectStatuses]);

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
            <div
              data-testid="workload-header-row"
              className="sticky top-0 z-10 flex shrink-0 border-b bg-secondary"
            >
              <div className="w-52 shrink-0 px-4 py-2.5 text-micro font-bold text-muted-foreground uppercase tracking-wider">
                Member
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-bold text-muted-foreground text-center">
                Tickets
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-bold text-muted-foreground text-center">
                Points
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-bold text-muted-foreground text-center">
                Leave
              </div>
              <div className="w-24 shrink-0 px-2 py-2.5 text-micro font-bold text-muted-foreground text-center">
                Allocation
              </div>
              <div className="w-24 shrink-0 px-2 py-2.5 text-micro font-bold text-muted-foreground text-center">
                Estimate
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-bold text-muted-foreground text-center">
                Actual
              </div>
              <div className="w-24 shrink-0 px-2 py-2.5 text-micro font-bold text-muted-foreground text-center">
                Variance
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
                    focused={focusedMemberId === member.id}
                    motionDelay={idx * 0.04}
                    reducedMotion={shouldReduceMotion}
                    onToggle={handleToggleExpand}
                    capacityData={capacityByMemberId?.get(member.id)}
                  />
                ),
              )
            )}

            {showUnassignedRow && (
              <WorkloadUnassignedRow
                tickets={unassigned}
                projectId={projectId}
                projectKey={projectKey}
                expanded={expandedMembers.has("__unassigned__")}
                reducedMotion={shouldReduceMotion}
                motionDelay={memberWorkload.length * 0.04}
                onToggle={handleToggleUnassigned}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
