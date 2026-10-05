import { isSameDay, parseISO } from "date-fns";
import { Users, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";
import type { KanbanTicket } from "../shared/types";
import { isCompletedTicketStatus } from "../shared/completed-status";
import type {
  FilterState,
  StatFilter,
  MemberCapacityData,
  WorkloadGroup,
} from "./workload-types";

export interface WorkloadMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
}

export interface WorkloadMemberEntry {
  member: WorkloadMember;
  memberTickets: KanbanTicket[];
  ticketsByDay: { day: Date; count: number }[];
  total: number;
  overdue: number;
  points: number;
}

export interface WorkloadGroupEntry {
  key: string;
  label: string | null;
  rows: WorkloadMemberEntry[];
}

export interface WorkloadViewProps {
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
  group?: WorkloadGroup;
}

export function applyTicketFilters(
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

export function ticketMatchesDay(ticket: KanbanTicket, day: Date): boolean {
  if (!ticket.dueDate) return false;
  try {
    return isSameDay(parseISO(ticket.dueDate), day);
  } catch {
    return false;
  }
}

export function isTicketOverdue(
  ticket: KanbanTicket,
  statuses?: Array<{ name: string; type?: string | null }>,
): boolean {
  if (!ticket.dueDate) return false;
  try {
    return (
      parseISO(ticket.dueDate) < new Date() &&
      !isCompletedTicketStatus(ticket.status, statuses)
    );
  } catch {
    return false;
  }
}

export interface WorkloadStat {
  id: StatFilter;
  label: string;
  icon: ComponentType<{ className?: string }>;
  bg: string;
  text: string;
}

export const STATS: readonly WorkloadStat[] = [
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
