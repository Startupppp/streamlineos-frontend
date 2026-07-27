import type { AllWorkTicket } from "@/types/projects";
import type { KanbanTicket } from "@/features/build/shared/types";

export interface ProjectGroup {
  projectId: number;
  projectKey: string;
  projectName: string;
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
    order: t.order ?? undefined,
    epicId: t.epicId ?? undefined,
    assigneeId: t.assigneeId ?? undefined,
    sprintId: t.sprintId ?? undefined,
    cycleId: t.cycleId,
    dueDate: t.dueDate,
    startDate: t.startDate,
    sequenceId: t.sequenceId,
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
  sprintId: number | null | undefined;
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
    sequenceId: t.sequenceId,
    startDate: t.startDate,
    dueDate: t.dueDate,
    assigneeId: t.assigneeId,
    cycleId: t.cycleId,
    sprintId: t.sprintId,
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

export function groupByProject(tickets: AllWorkTicket[]): ProjectGroup[] {
  const map = new Map<number, ProjectGroup>();
  for (const t of tickets) {
    const existing = map.get(t.projectId);
    if (existing) {
      existing.tickets.push(t);
    } else {
      map.set(t.projectId, {
        projectId: t.projectId,
        projectKey: t.projectKey,
        projectName: t.projectName,
        tickets: [t],
      });
    }
  }
  return Array.from(map.values());
}
