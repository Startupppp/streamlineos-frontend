"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronDown,
  ChevronRight,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/utils";
import type { KanbanTicket } from "./shared/types";

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
}

function getDays(count: number): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

function getInitials(first?: string | null, last?: string | null): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function getUtilizationClass(count: number): string {
  if (count === 0) return "bg-slate-100";
  if (count <= 2) return "bg-emerald-100 text-emerald-700";
  if (count <= 4) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function getTotalColor(total: number): string {
  if (total > 5) return "text-red-600";
  if (total > 3) return "text-amber-600";
  return "text-slate-700";
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

export function WorkloadView({ tickets, members }: WorkloadViewProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set(),
  );
  const days = useMemo(() => getDays(14), []);

  const memberWorkload = useMemo(() => {
    return members.map((member) => {
      const memberTickets = tickets.filter((t) => t.assigneeId === member.id);
      const ticketsByDay = days.map((day) => {
        const matched = memberTickets.filter((t) => ticketMatchesDay(t, day));
        return { day, count: matched.length, tickets: matched };
      });
      const total = memberTickets.length;
      const overdue = memberTickets.filter(isTicketOverdue).length;
      return { member, memberTickets, ticketsByDay, total, overdue };
    });
  }, [members, tickets, days]);

  const unassigned = tickets.filter((t) => !t.assigneeId);
  const totalAssigned = tickets.filter((t) => !!t.assigneeId).length;
  const overCapacity = memberWorkload.filter((m) => m.total > 5).length;

  function handleToggleExpand(memberId: string) {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }

  const stats = [
    {
      label: "Total Tickets",
      value: tickets.length,
      icon: TrendingUp,
      color: "text-violet-600",
    },
    {
      label: "Assigned",
      value: totalAssigned,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      label: "Unassigned",
      value: unassigned.length,
      icon: Users,
      color: "text-amber-600",
    },
    {
      label: "Over Capacity",
      value: overCapacity,
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/80 p-3 flex items-center gap-3"
          >
            <div
              className={cn(
                "h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0",
                stat.color,
              )}
            >
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex border-b bg-slate-50/60">
              <div className="w-48 shrink-0 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Member
              </div>
              <div className="w-16 shrink-0 px-2 py-2.5 text-xs font-semibold text-slate-500 text-center">
                Total
              </div>
              {days.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-12 shrink-0 px-1 py-2.5 text-center",
                    isSameDay(day, new Date()) && "bg-violet-50",
                  )}
                >
                  <p className="text-[10px] font-semibold text-slate-500">
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={cn(
                      "text-[11px]",
                      isSameDay(day, new Date())
                        ? "text-violet-700 font-bold"
                        : "text-slate-400",
                    )}
                  >
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>

            {memberWorkload.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                No team members with assigned tickets
              </div>
            ) : (
              memberWorkload.map(
                ({ member, memberTickets, ticketsByDay, total, overdue }, idx) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <div
                      className={cn(
                        "flex items-center border-b cursor-pointer hover:bg-slate-50/60 transition-colors",
                        expandedMembers.has(member.id) && "bg-violet-50/30",
                      )}
                      role="button"
                      onClick={() => handleToggleExpand(member.id)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleToggleExpand(member.id)
                      }
                      tabIndex={0}
                      aria-expanded={expandedMembers.has(member.id)}
                    >
                      <div className="w-48 shrink-0 px-4 py-3 flex items-center gap-2">
                        {expandedMembers.has(member.id) ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={resolveImageUrl(member.image)} />
                          <AvatarFallback className="text-[9px]">
                            {getInitials(member.firstName, member.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">
                          {member.firstName ?? member.name ?? member.id}
                        </span>
                        {overdue > 0 && (
                          <span className="ml-auto h-4 w-4 rounded-full bg-red-100 text-red-700 text-[9px] flex items-center justify-center font-bold shrink-0">
                            {overdue}
                          </span>
                        )}
                      </div>

                      <div className="w-16 shrink-0 px-2 py-3 text-center">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            getTotalColor(total),
                          )}
                        >
                          {total}
                        </span>
                      </div>

                      {ticketsByDay.map(({ count }, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-12 shrink-0 px-1 py-3 flex items-center justify-center",
                            isSameDay(days[i]!, new Date()) && "bg-violet-50/50",
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
                      {expandedMembers.has(member.id) &&
                        memberTickets.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-slate-50/40"
                          >
                            {memberTickets.slice(0, 10).map((ticket) => (
                              <div
                                key={ticket.id}
                                className="flex items-center border-b border-slate-100 px-8 py-2 gap-2"
                              >
                                <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">
                                  #{ticket.ticketNumber}
                                </span>
                                <span className="text-xs text-slate-700 truncate flex-1">
                                  {ticket.title}
                                </span>
                                {ticket.dueDate && (
                                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                    Due{" "}
                                    {format(parseISO(ticket.dueDate), "MMM d")}
                                  </span>
                                )}
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
                ),
              )
            )}

            {unassigned.length > 0 && (
              <div className="flex items-center border-b bg-amber-50/20">
                <div className="w-48 shrink-0 px-4 py-3 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <Users className="h-3 w-3 text-slate-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Unassigned
                  </span>
                </div>
                <div className="w-16 shrink-0 px-2 py-3 text-center">
                  <span className="text-sm font-semibold text-amber-600">
                    {unassigned.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
