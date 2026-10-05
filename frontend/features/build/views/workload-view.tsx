"use client";

import { Fragment, useState, useMemo, memo, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { format, addDays, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { KanbanTicket } from "../shared/types";
import { WorkloadMemberRow } from "./workload-member-row";
import { WorkloadUnassignedRow } from "./workload-unassigned-row";
import type { FilterState, StatFilter } from "./workload-types";
import { hasActiveWorkloadFilters, isMemberOverCapacity } from "./workload-types";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  WorkloadMemberEntry,
  WorkloadGroupEntry,
  WorkloadViewProps,
} from "./workload-view-model";
import {
  STATS,
  applyTicketFilters,
  ticketMatchesDay,
  isTicketOverdue,
} from "./workload-view-model";
import { StatButton } from "./workload-stat-button";

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
  group = "none",
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

  const groupedWorkload = useMemo<WorkloadGroupEntry[]>(() => {
    if (group !== "team")
      return [{ key: "all", label: null, rows: memberWorkload }];
    const byTeam = new Map<string, WorkloadGroupEntry>();
    const withoutTeam: WorkloadMemberEntry[] = [];
    for (const row of memberWorkload) {
      const teams = capacityByMemberId?.get(row.member.id)?.teams ?? [];
      if (teams.length === 0) {
        withoutTeam.push(row);
        continue;
      }
      for (const team of teams) {
        const key = `team:${team.id}`;
        const entry = byTeam.get(key) ?? { key, label: team.name, rows: [] };
        entry.rows.push(row);
        byTeam.set(key, entry);
      }
    }
    const entries = [...byTeam.values()].sort((a, b) =>
      (a.label ?? "").localeCompare(b.label ?? ""),
    );
    if (withoutTeam.length > 0)
      entries.push({ key: "team:none", label: "No team", rows: withoutTeam });
    return entries;
  }, [group, memberWorkload, capacityByMemberId]);

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

  const statValues: Record<StatFilter, number> = { all: filteredTickets.length, assigned: totalAssigned, unassigned: unassigned.length, "over-capacity": overCapacityCount };

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
              <div className="w-52 shrink-0 px-4 py-2.5 text-micro font-medium text-muted-foreground uppercase tracking-wider">
                Member
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-medium text-muted-foreground text-center">
                Tickets
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-medium text-muted-foreground text-center">
                Points
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-medium text-muted-foreground text-center">
                Leave
              </div>
              <div className="w-24 shrink-0 px-2 py-2.5 text-micro font-medium text-muted-foreground text-center">
                Allocation
              </div>
              <div className="w-24 shrink-0 px-2 py-2.5 text-micro font-medium text-muted-foreground text-center">
                Estimate
              </div>
              <div className="w-20 shrink-0 px-2 py-2.5 text-micro font-medium text-muted-foreground text-center">
                Actual
              </div>
              <div className="w-24 shrink-0 px-2 py-2.5 text-micro font-medium text-muted-foreground text-center">
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
                  <p className="text-micro font-medium text-muted-foreground uppercase tracking-wider">
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={cn(
                      "text-dense",
                      isSameDay(day, new Date())
                        ? "text-primary font-medium"
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
              groupedWorkload.map((groupEntry) => (
                <Fragment key={groupEntry.key}>
                  {groupEntry.label !== null && (
                    <div
                      data-testid="workload-group-caption"
                      className="flex shrink-0 border-b border-border bg-muted/40 px-4 py-1.5 text-micro font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {groupEntry.label}
                      <span className="ml-2 tabular-nums font-normal normal-case tracking-normal">
                        {groupEntry.rows.length}
                      </span>
                    </div>
                  )}
                  {groupEntry.rows.map(
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
                        key={`${groupEntry.key}:${member.id}`}
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
                  )}
                </Fragment>
              ))
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
