import type {
  AllWorkTicket,
  ProjectMember,
  Ticket,
  UpdateTicketInput,
} from "@/types/projects";

function resolveAssigneeId(
  input: UpdateTicketInput,
): string | null | undefined {
  if (input.assigneeIds !== undefined) return input.assigneeIds[0] ?? null;
  if (input.assigneeId !== undefined) return input.assigneeId;
  return undefined;
}

function assignee(
  assigneeId: string | null,
  members: ProjectMember[],
): AllWorkTicket["assignee"] {
  const user = assigneeId
    ? members.find((member) => member.user?.id === assigneeId)?.user
    : undefined;
  return user
    ? {
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        image: user.image,
      }
    : null;
}

export function applyTicketPatch(
  ticket: Ticket,
  input: UpdateTicketInput,
  members: ProjectMember[],
): Ticket {
  const next: Ticket = { ...ticket };
  if (input.title !== undefined) next.title = input.title;
  if (input.description !== undefined) next.description = input.description;
  if (input.type !== undefined) next.type = input.type;
  if (input.status !== undefined) next.status = input.status;
  if (input.priority !== undefined) next.priority = input.priority;
  if (input.points !== undefined) next.points = input.points;
  if (input.epicId !== undefined) next.epicId = input.epicId;
  if (input.moduleId !== undefined) next.moduleId = input.moduleId;
  if (input.cycleId !== undefined) next.cycleId = input.cycleId;
  if (input.startDate !== undefined) next.startDate = input.startDate;
  if (input.dueDate !== undefined) next.dueDate = input.dueDate;
  if (input.parentTicketId !== undefined)
    next.parentTicketId = input.parentTicketId;
  const assigneeId = resolveAssigneeId(input);
  if (assigneeId !== undefined) {
    next.assigneeId = assigneeId;
    next.assignee = assignee(assigneeId, members);
  }
  return next;
}

export function applyAllWorkTicketPatch(
  ticket: AllWorkTicket,
  input: UpdateTicketInput,
  members: ProjectMember[],
): AllWorkTicket {
  const next = { ...ticket, updatedAt: new Date().toISOString() };
  if (input.title !== undefined) next.title = input.title;
  if (input.type !== undefined) next.type = input.type;
  if (input.status !== undefined) next.status = input.status;
  if (input.priority !== undefined) next.priority = input.priority;
  if (input.points !== undefined) next.points = input.points;
  if (input.epicId !== undefined) next.epicId = input.epicId;
  if (input.cycleId !== undefined) next.cycleId = input.cycleId;
  if (input.startDate !== undefined) next.startDate = input.startDate;
  if (input.dueDate !== undefined) next.dueDate = input.dueDate;
  const assigneeId = resolveAssigneeId(input);
  if (assigneeId !== undefined) {
    next.assigneeId = assigneeId;
    next.assignee = assignee(assigneeId, members);
  }
  return next;
}
