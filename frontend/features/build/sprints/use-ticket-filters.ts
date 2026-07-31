import { useState, useMemo } from "react";
import type { PlanningTicket, PlanningTicketUser } from "./planning-card";

export const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TYPE_OPTIONS = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;
export const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

export function useTicketFilters(tickets: PlanningTicket[]) {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("__all__");
  const [filterType, setFilterType] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterAssignee, setFilterAssignee] = useState("__all__");

  const assigneeOptions = useMemo(() => {
    const seen = new Map<string, PlanningTicketUser & { id: string }>();
    for (const t of tickets) {
      if (t.assigneeId && t.assignee) {
        seen.set(t.assigneeId, { ...t.assignee, id: t.assigneeId });
      }
    }
    return Array.from(seen.values());
  }, [tickets]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return tickets.filter((t) => {
      if (lower) {
        const titleMatch = (t.title ?? "").toLowerCase().includes(lower);
        const keyMatch = t.ticketNumber != null && String(t.ticketNumber).includes(lower);
        if (!titleMatch && !keyMatch) return false;
      }
      if (filterPriority !== "__all__" && t.priority !== filterPriority) return false;
      if (filterType !== "__all__" && t.type !== filterType) return false;
      if (filterStatus !== "__all__" && t.status !== filterStatus) return false;
      if (filterAssignee !== "__all__") {
        if (filterAssignee === "__unassigned__" && t.assigneeId) return false;
        if (filterAssignee !== "__unassigned__" && t.assigneeId !== filterAssignee) return false;
      }
      return true;
    });
  }, [tickets, search, filterPriority, filterType, filterStatus, filterAssignee]);

  const hasActiveFilters =
    search !== "" ||
    filterPriority !== "__all__" ||
    filterType !== "__all__" ||
    filterStatus !== "__all__" ||
    filterAssignee !== "__all__";

  function clearFilters() {
    setSearch("");
    setFilterPriority("__all__");
    setFilterType("__all__");
    setFilterStatus("__all__");
    setFilterAssignee("__all__");
  }

  return {
    search, setSearch,
    filterPriority, setFilterPriority,
    filterType, setFilterType,
    filterStatus, setFilterStatus,
    filterAssignee, setFilterAssignee,
    filtered,
    hasActiveFilters,
    clearFilters,
    assigneeOptions,
  };
}

export type TicketFilters = ReturnType<typeof useTicketFilters>;
