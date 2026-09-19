import type { z } from "zod";
import type { Ticket } from "@/types/projects/tasks";
import type { KanbanTicket } from "@/features/build/shared/types";
import type { ticketListRowContract } from "@/hooks/api/build/build-tickets-core-schema";

type BoardTicket = Ticket &
  Pick<z.infer<typeof ticketListRowContract>, "descriptionExcerpt">;

export function mapBoardTicketToKanban(t: BoardTicket): KanbanTicket {
  return {
    id: t.id,
    title: t.title,
    descriptionExcerpt: t.descriptionExcerpt ?? null,
    status: t.status ?? "TODO",
    type: t.type ?? "TASK",
    priority: t.priority ?? undefined,
    points: t.points ?? undefined,
    timeSpent: t.timeSpent ?? undefined,
    ticketNumber: t.ticketNumber,
    rank: t.rank ?? undefined,
    epicId: t.epicId ?? undefined,
    assigneeId: t.assigneeId ?? undefined,
    sprintId: t.sprintId ?? undefined,
    cycleId: t.cycleId ?? null,
    moduleId: t.moduleId ?? null,
    dueDate: t.dueDate ?? null,
    startDate: t.startDate ?? null,
    createdAt: t.createdAt != null ? String(t.createdAt) : null,
    updatedAt: t.updatedAt != null ? String(t.updatedAt) : null,
    sequenceId: t.sequenceId ?? null,
    assignees: t.assignees,
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
    labels: (t.labels || []).flatMap((l) =>
      l.label
        ? [{ label: { id: l.label.id, name: l.label.name, color: l.label.color } }]
        : [],
    ),
    cycle: t.cycle
      ? {
          id: t.cycle.id,
          name: t.cycle.name,
          status: t.cycle.status,
          startDate: t.cycle.startDate,
          endDate: t.cycle.endDate,
        }
      : null,
  };
}
