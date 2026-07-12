"use client";

import { useState, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
  Info,
} from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { KanbanTicket } from "../shared/types";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { TicketQuickActions } from "./ticket-quick-actions";
import { stopEvent, InlineAssignee } from "./card-inline-fields";
import { useSprints } from "@/hooks/api/projects/sprints";
import { useCycles } from "@/hooks/api/projects/advanced";
import Link from "next/link";

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
  members: WorkloadMember[];
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
}

type StatFilter = "all" | "assigned" | "unassigned" | "over-capacity";

interface FilterState {
  statCard: StatFilter;
  sprintId: string;
  cycleId: string;
  priority: string;
  type: string;
  status: string;
  assigneeId: string;
  showUnassigned: boolean;
}

const INITIAL_FILTERS: FilterState = {
  statCard: "all",
  sprintId: "all",
  cycleId: "all",
  priority: "all",
  type: "all",
  status: "all",
  assigneeId: "all",
  showUnassigned: true,
};

const TICKET_TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"];
const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];

function getDays(count: number): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

function getUtilizationClass(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-emerald-100 text-emerald-700";
  if (count <= 4) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
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

function MemberNameCell({ member }: { member: WorkloadMember }) {
  const display = getUserDisplayName(member);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm font-medium truncate">{display}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{display}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const WorkloadView = memo(function WorkloadView({
  tickets,
  members,
  projectId,
  projectStatuses,
}: WorkloadViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const days = useMemo(() => getDays(14), []);

  const { data: sprints = [] } = useSprints(projectId);
  const { data: cycles = [] } = useCycles(projectId);

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
        const matched = memberTickets.filter((t) => ticketMatchesDay(t, day));
        return { day, count: matched.length, tickets: matched };
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

  const handleToggleExpand = useCallback((memberId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  function handleStatCardClick(card: StatFilter) {
    setFilters((prev) => ({
      ...prev,
      statCard: prev.statCard === card ? "all" : card,
    }));
  }

  function handleFilterChange<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const hasActiveFilters =
    filters.sprintId !== "all" ||
    filters.cycleId !== "all" ||
    filters.priority !== "all" ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.assigneeId !== "all" ||
    filters.statCard !== "all";

  const stats = [
    {
      id: "all" as StatFilter,
      label: "Total Tickets",
      value: filteredTickets.length,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      id: "assigned" as StatFilter,
      label: "Assigned",
      value: totalAssigned,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      id: "unassigned" as StatFilter,
      label: "Unassigned",
      value: unassigned.length,
      icon: Users,
      color: "text-amber-600",
    },
    {
      id: "over-capacity" as StatFilter,
      label: "Over Capacity",
      value: overCapacityCount,
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ] as const;

  const showUnassignedRow =
    filters.showUnassigned &&
    unassigned.length > 0 &&
    filters.statCard !== "assigned" &&
    filters.statCard !== "over-capacity";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <button
            key={stat.id}
            type="button"
            onClick={() => handleStatCardClick(stat.id)}
            className={cn(
              "bg-card rounded-lg border border-border p-3 flex items-center gap-3 shadow-sm text-left transition-colors hover:bg-muted/40",
              filters.statCard === stat.id && stat.id !== "all" && "ring-2 ring-primary/30 bg-primary/5",
            )}
          >
            <div className={cn("h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0", stat.color)}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Select value={filters.sprintId} onValueChange={(v) => handleFilterChange("sprintId", v)}>
          <SelectTrigger className="h-7 text-[11px] w-32">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sprints</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.cycleId} onValueChange={(v) => handleFilterChange("cycleId", v)}>
          <SelectTrigger className="h-7 text-[11px] w-32">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cycles</SelectItem>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(v) => handleFilterChange("priority", v)}>
          <SelectTrigger className="h-7 text-[11px] w-28">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(v) => handleFilterChange("type", v)}>
          <SelectTrigger className="h-7 text-[11px] w-24">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TICKET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {projectStatuses && projectStatuses.length > 0 && (
          <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
            <SelectTrigger className="h-7 text-[11px] w-28">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {projectStatuses.map((s) => (
                <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filters.assigneeId} onValueChange={(v) => handleFilterChange("assigneeId", v)}>
          <SelectTrigger className="h-7 text-[11px] w-32">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{getUserDisplayName(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <button
            type="button"
            className="h-7 text-[11px] px-2 rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
            onClick={() => setFilters(INITIAL_FILTERS)}
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0" />
          <span>Workload shows ticket count per member. Points are summed where set.</span>
        </div>
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
                  <p
                    className={cn(
                      "text-[11px]",
                      isSameDay(day, new Date()) ? "text-blue-600 font-bold" : "text-muted-foreground",
                    )}
                  >
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
                <motion.div
                  key={member.id}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.2, ease: "easeOut" }}
                >
                  <div
                    className={cn(
                      "flex items-center border-b cursor-pointer hover:bg-muted/30 transition-colors",
                      expandedMembers.has(member.id) && "bg-muted/40",
                      total > 5 && "border-l-2 border-l-red-400",
                    )}
                    role="button"
                    onClick={() => handleToggleExpand(member.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleToggleExpand(member.id)}
                    tabIndex={0}
                    aria-expanded={expandedMembers.has(member.id)}
                  >
                    <div className="w-52 shrink-0 px-4 py-3 flex items-center gap-2">
                      {expandedMembers.has(member.id) ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={resolveImageUrl(member.image)} />
                        <AvatarFallback className="text-[9px]">
                          {getUserInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <MemberNameCell member={member} />
                      {overdue > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-auto h-4 w-4 rounded-full bg-red-100 text-red-700 text-[9px] flex items-center justify-center font-bold shrink-0">
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
                                total > 5 ? "text-red-600" : total > 3 ? "text-amber-600" : "text-foreground",
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
                    {expandedMembers.has(member.id) && memberTickets.length > 0 && (
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
                            <span className="text-xs text-foreground truncate flex-1">
                              {ticket.title}
                            </span>
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
                              href={`/projects/${projectId}?ticket=${ticket.id}`}
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
                              <TicketQuickActions
                                ticketId={ticket.id}
                                projectId={projectId}
                              />
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
                    expandedMembers.has("__unassigned__") && "bg-amber-50/60",
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
                    <span className="text-sm font-semibold text-amber-600">{unassigned.length}</span>
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
                      className="overflow-hidden bg-amber-50/30"
                    >
                      {unassigned.slice(0, 10).map((ticket) => (
                        <div
                          key={ticket.id}
                          className="group/unassigned flex items-center border-b border-border/40 px-8 py-2 gap-2"
                        >
                          <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">
                            #{ticket.ticketNumber}
                          </span>
                          <span className="text-xs text-foreground truncate flex-1">{ticket.title}</span>
                          {ticket.points != null && (
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                              {ticket.points}pt
                            </span>
                          )}
                          <Link
                            href={`/projects/${projectId}?ticket=${ticket.id}`}
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
