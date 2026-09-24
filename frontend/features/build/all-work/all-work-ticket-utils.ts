import type { AllWorkTicket } from "@/types/projects";
import type { KanbanTicket } from "@/features/build/shared/types";
import type { BuildListGrouping } from "@/features/build/shared/use-build-list-url-state";

export interface TicketGroup {
  id: string | number;
  label: string;
  projectId?: number;
  projectKey?: string;
  tickets: AllWorkTicket[];
}

export function toKanbanTicket(t: AllWorkTicket): KanbanTicket {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    type: t.type,
    priority: t.priority ?? undefined,
    points: t.points ?? undefined,
    ticketNumber: t.ticketNumber,
    rank: t.rank ?? undefined,
    epicId: t.epicId ?? undefined,
    assigneeId: t.assigneeId ?? undefined,
    cycleId: t.cycleId,
    dueDate: t.dueDate,
    startDate: t.startDate,
    sequenceId: undefined,
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          name: t.assignee.name ?? undefined,
          firstName: t.assignee.firstName ?? undefined,
          lastName: t.assignee.lastName ?? undefined,
          email: t.assignee.email ?? undefined,
          image: t.assignee.image ?? null,
        }
      : null,
    labels: t.labels.map((l) => ({
      label: { id: l.id, name: l.name, color: l.color },
    })),
  };
}

export type TableRow = {
  id: number;
  title: string;
  status: string;
  type: string;
  priority: string | null | undefined;
  points: number | null | undefined;
  ticketNumber: number;
  sequenceId: string | null | undefined;
  startDate: string | null | undefined;
  dueDate: string | null | undefined;
  assigneeId: string | null | undefined;
  cycleId: number | null | undefined;
  assignee: {
    id: string;
    name: string | undefined;
    firstName: string | undefined;
    lastName: string | undefined;
    email: string | undefined;
    image: string | null;
  } | null;
  labels: { label: { id: number; name: string; color: string } }[];
};

export function toTableTicket(t: AllWorkTicket): TableRow {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    type: t.type,
    priority: t.priority,
    points: t.points,
    ticketNumber: t.ticketNumber,
    sequenceId: undefined,
    startDate: t.startDate,
    dueDate: t.dueDate,
    assigneeId: t.assigneeId,
    cycleId: t.cycleId,
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          name: t.assignee.name ?? undefined,
          firstName: t.assignee.firstName ?? undefined,
          lastName: t.assignee.lastName ?? undefined,
          email: t.assignee.email ?? undefined,
          image: t.assignee.image ?? null,
        }
      : null,
    labels: t.labels.map((l) => ({
      label: { id: l.id, name: l.name, color: l.color },
    })),
  };
}

function groupByProject(tickets: AllWorkTicket[]): TicketGroup[] {
  const map = new Map<number, TicketGroup>();
  for (const t of tickets) {
    if (t.projectId === null) continue;
    const existing = map.get(t.projectId);
    if (existing) {
      existing.tickets.push(t);
    } else {
      map.set(t.projectId, {
        id: t.projectId,
        label: t.projectName ?? "",
        projectId: t.projectId,
        projectKey: t.projectKey ?? "",
        tickets: [t],
      });
    }
  }
  return Array.from(map.values());
}

function groupByStatus(tickets: AllWorkTicket[]): TicketGroup[] {
  const map = new Map<string, AllWorkTicket[]>();
  for (const t of tickets) {
    const key = t.status;
    const existing = map.get(key);
    if (existing) existing.push(t);
    else map.set(key, [t]);
  }
  return Array.from(map.entries()).map(([status, ts]) => ({
    id: status,
    label: status.replace(/_/g, " "),
    tickets: ts,
  }));
}

function groupByPriority(tickets: AllWorkTicket[]): TicketGroup[] {
  const map = new Map<string, AllWorkTicket[]>();
  for (const t of tickets) {
    const key = t.priority ?? "NONE";
    const existing = map.get(key);
    if (existing) existing.push(t);
    else map.set(key, [t]);
  }
  return Array.from(map.entries()).map(([priority, ts]) => ({
    id: priority,
    label: priority === "NONE" ? "No priority" : priority,
    tickets: ts,
  }));
}

function groupByAssignee(tickets: AllWorkTicket[]): TicketGroup[] {
  const map = new Map<string, AllWorkTicket[]>();
  for (const t of tickets) {
    const key = t.assigneeId ?? "__unassigned__";
    const existing = map.get(key);
    if (existing) existing.push(t);
    else map.set(key, [t]);
  }
  return Array.from(map.entries()).map(([assigneeId, ts]) => {
    const first = ts[0];
    const assignee = first?.assignee;
    const name = assignee
      ? ([assignee.firstName, assignee.lastName].filter(Boolean).join(" ") ||
          assignee.name ||
          "Unknown")
      : "Unassigned";
    return { id: assigneeId, label: name ?? "Unassigned", tickets: ts };
  });
}

export function groupTickets(
  tickets: AllWorkTicket[],
  grouping: BuildListGrouping,
): TicketGroup[] {
  switch (grouping) {
    case "project":
      return groupByProject(tickets);
    case "status":
      return groupByStatus(tickets);
    case "priority":
      return groupByPriority(tickets);
    case "assignee":
      return groupByAssignee(tickets);
    default:
      return tickets.length === 0
        ? []
        : [{ id: "all", label: "All Tickets", tickets }];
  }
}
