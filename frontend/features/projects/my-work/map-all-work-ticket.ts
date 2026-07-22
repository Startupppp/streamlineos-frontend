import type { AllWorkTicket } from "@/types/projects";
import type { KanbanTicket } from "@/features/projects/shared/types";

export interface AllWorkTicketMeta {
  id: number;
  projectId: number;
  projectKey: string;
  ticketNumber: number;
}

export function mapAllWorkTicketToKanban(t: AllWorkTicket): KanbanTicket {
  return {
    id: t.id,
    title: t.title,
    status: t.status ?? "TODO",
    type: t.type ?? "TASK",
    priority: t.priority ?? undefined,
    points: t.points ?? undefined,
    ticketNumber: t.ticketNumber,
    order: t.order ?? undefined,
    epicId: t.epicId ?? undefined,
    assigneeId: t.assigneeId ?? undefined,
    sprintId: t.sprintId ?? undefined,
    cycleId: t.cycleId ?? null,
    dueDate: t.dueDate ?? null,
    startDate: t.startDate ?? null,
    updatedAt: t.updatedAt != null ? String(t.updatedAt) : null,
    sequenceId: t.sequenceId ?? null,
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
    labels: (t.labels ?? []).map((l) => ({
      label: { id: l.id, name: l.name, color: l.color ?? null },
    })),
  };
}

export function buildTicketMetaMap(
  tickets: AllWorkTicket[],
): Map<number, AllWorkTicketMeta> {
  const map = new Map<number, AllWorkTicketMeta>();
  for (const t of tickets) {
    map.set(t.id, {
      id: t.id,
      projectId: t.projectId,
      projectKey: t.projectKey,
      ticketNumber: t.ticketNumber,
    });
  }
  return map;
}
