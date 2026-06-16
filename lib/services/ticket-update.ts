import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tickets, ticketAssignees, users } from "@/lib/db/schema";
import { createNotification } from "@/server/actions/create-notification";
import { logTicketFieldChanges } from "@/lib/services/ticket-activity";
import { logger } from "@/lib/logger";
import {
  sendTicketAssignmentEmail,
  sendTicketReviewRequestEmail,
  sendTicketChangesRequestedEmail,
} from "@/lib/email";

export const updateTicketSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  sprintId: z.number().nullable().optional(),
  epicId: z.number().nullable().optional(),
  moduleId: z.number().nullable().optional(),
  points: z.number().nullable().optional(),
  originalEstimate: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

function normalizeType(type: string): string {
  const upper = type.toUpperCase();
  return upper === "FEATURE" ? "STORY" : upper;
}

function resolveAssigneeId(raw: string | undefined): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === "" || raw === "unassigned") return null;
  return raw;
}

function buildUpdateFields(input: UpdateTicketInput): Record<string, unknown> {
  const fields: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title) fields.title = input.title;
  if (input.description !== undefined) fields.description = input.description;
  if (input.type) fields.type = normalizeType(input.type);
  if (input.status) fields.status = input.status;
  if (input.priority) fields.priority = input.priority;
  const resolvedAssignee = resolveAssigneeId(input.assigneeId);
  if (resolvedAssignee !== undefined) fields.assigneeId = resolvedAssignee;
  if (input.sprintId !== undefined) fields.sprintId = input.sprintId;
  if (input.epicId !== undefined) fields.epicId = input.epicId;
  if (input.moduleId !== undefined) fields.moduleId = input.moduleId;
  if (input.points !== undefined) fields.points = input.points;
  if (input.originalEstimate !== undefined) {
    fields.originalEstimate = input.originalEstimate?.toString();
  }
  if (input.startDate !== undefined) fields.startDate = input.startDate;
  if (input.dueDate !== undefined) fields.dueDate = input.dueDate;
  return fields;
}

async function syncAssignees(
  ticketId: number,
  actingUserId: string,
  input: UpdateTicketInput,
): Promise<void> {
  if (input.assigneeIds !== undefined) {
    await db.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, ticketId));
    const allIds = new Set(input.assigneeIds);
    const primary = resolveAssigneeId(input.assigneeId);
    if (primary) allIds.add(primary);
    if (allIds.size > 0) {
      await db.insert(ticketAssignees).values(
        Array.from(allIds).map((userId) => ({
          ticketId,
          userId,
          assignedBy: actingUserId,
        })),
      );
    }
    return;
  }

  if (input.assigneeId !== undefined) {
    await db.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, ticketId));
    const newAssigneeId = resolveAssigneeId(input.assigneeId);
    if (newAssigneeId) {
      await db.insert(ticketAssignees).values({
        ticketId,
        userId: newAssigneeId,
        assignedBy: actingUserId,
      });
    }
  }
}

async function notifyNewAssignees(
  orgId: string,
  ticketId: number,
  actingUserId: string,
  actorName: string,
  input: UpdateTicketInput,
): Promise<void> {
  const notifyIds = new Set<string>();
  if (input.assigneeIds !== undefined) {
    input.assigneeIds.forEach((uid) => notifyIds.add(uid));
  } else {
    const primary = resolveAssigneeId(input.assigneeId);
    if (primary) notifyIds.add(primary);
  }
  if (notifyIds.size === 0) return;

  const ticketData = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    columns: { title: true, projectId: true, type: true, priority: true },
    with: { project: { columns: { name: true } } },
  });

  for (const userId of notifyIds) {
    if (userId === actingUserId) continue;
    try {
      await createNotification({
        orgId,
        userId,
        type: "INFO",
        title: "Ticket Assigned to You",
        message: `You have been assigned to ticket "${ticketData?.title ?? `#${ticketId}`}".`,
        link: ticketData?.projectId ? `/projects/${ticketData.projectId}` : undefined,
      });
    } catch (notifErr) {
      logger.error("Failed to create ticket assignment notification", { error: notifErr });
    }

    void (async () => {
      const assignee = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { email: true, name: true },
      });
      if (assignee?.email && ticketData?.projectId) {
        await sendTicketAssignmentEmail(
          assignee.email,
          assignee.name ?? "Team Member",
          ticketData.title ?? `#${ticketId}`,
          ticketData.type ?? "TASK",
          ticketData.priority ?? "MEDIUM",
          ticketData.project?.name ?? "Project",
          ticketData.projectId,
          ticketId,
          actorName,
        );
      }
    })().catch(() => {});
  }
}

async function notifyStatusReview(
  ticketId: number,
  actorName: string,
  status: string,
): Promise<void> {
  const ticketData = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    columns: {
      title: true,
      projectId: true,
      type: true,
      assigneeId: true,
      reporterId: true,
    },
    with: { project: { columns: { name: true } } },
  });
  if (!ticketData?.projectId) return;

  if (status === "IN_REVIEW" && ticketData.reporterId) {
    const reviewer = await db.query.users.findFirst({
      where: eq(users.id, ticketData.reporterId),
      columns: { email: true, name: true },
    });
    if (reviewer?.email) {
      await sendTicketReviewRequestEmail(
        reviewer.email,
        reviewer.name ?? "Reviewer",
        ticketData.title ?? `#${ticketId}`,
        ticketData.type ?? "TASK",
        ticketData.project?.name ?? "Project",
        ticketData.projectId,
        ticketId,
        actorName,
      );
    }
  }

  if (status === "CHANGES_REQUESTED" && ticketData.assigneeId) {
    const assignee = await db.query.users.findFirst({
      where: eq(users.id, ticketData.assigneeId),
      columns: { email: true, name: true },
    });
    if (assignee?.email) {
      await sendTicketChangesRequestedEmail(
        assignee.email,
        assignee.name ?? "Team Member",
        ticketData.title ?? `#${ticketId}`,
        ticketData.project?.name ?? "Project",
        ticketData.projectId,
        ticketId,
        actorName,
      );
    }
  }
}

export async function updateTicket(
  orgId: string,
  actingUserId: string,
  actorName: string,
  ticketId: number,
  input: UpdateTicketInput,
): Promise<void> {
  const updateFields = buildUpdateFields(input);

  const before = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), eq(tickets.orgId, orgId)),
    columns: {
      title: true,
      status: true,
      priority: true,
      assigneeId: true,
      sprintId: true,
      dueDate: true,
    },
  });

  await db
    .update(tickets)
    .set(updateFields)
    .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, orgId)));

  if (before) {
    try {
      await logTicketFieldChanges(db, orgId, ticketId, actingUserId, before, {
        title: input.title,
        status: input.status,
        priority: input.priority,
        assigneeId: resolveAssigneeId(input.assigneeId),
        sprintId: input.sprintId,
        dueDate: input.dueDate,
      });
    } catch (logErr) {
      logger.error("Failed to log ticket activity", { error: logErr });
    }
  }

  await syncAssignees(ticketId, actingUserId, input);
  await notifyNewAssignees(orgId, ticketId, actingUserId, actorName, input);

  if (input.status === "IN_REVIEW" || input.status === "CHANGES_REQUESTED") {
    void notifyStatusReview(ticketId, actorName, input.status).catch(() => {});
  }
}
