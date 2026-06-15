import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSupportTicket } from "@/server/queries/support";
import { db } from "@/lib/db";
import { supportTickets, supportTicketActivity, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendSupportTicketStatusEmail, sendSupportTicketCreatedEmail } from "@/lib/email";
import { invalidateCachePattern } from "@/lib/cache";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
});

type TicketUpdateInput = z.infer<typeof updateSchema>;

type ActivityAction =
  | "status_changed"
  | "priority_changed"
  | "assignee_changed"
  | "resolved"
  | "reopened";

interface ExistingTicket {
  status: string;
  priority: string | null;
  assigneeId: string | null;
}

async function logTicketActivity(
  orgId: string,
  ticketId: number,
  userId: string,
  previous: ExistingTicket,
  input: TicketUpdateInput
) {
  const entries: {
    action: ActivityAction;
    fromValue: string | null;
    toValue: string | null;
  }[] = [];

  if (input.status && input.status !== previous.status) {
    const action: ActivityAction =
      input.status === "RESOLVED"
        ? "resolved"
        : (previous.status === "RESOLVED" || previous.status === "CLOSED") &&
            input.status !== "CLOSED"
          ? "reopened"
          : "status_changed";
    entries.push({ action, fromValue: previous.status, toValue: input.status });
  }

  if (input.priority && input.priority !== previous.priority) {
    entries.push({
      action: "priority_changed",
      fromValue: previous.priority,
      toValue: input.priority,
    });
  }

  if (
    input.assigneeId !== undefined &&
    input.assigneeId !== (previous.assigneeId ?? "")
  ) {
    entries.push({
      action: "assignee_changed",
      fromValue: previous.assigneeId,
      toValue: input.assigneeId || null,
    });
  }

  if (entries.length === 0) return;

  try {
    await db.insert(supportTicketActivity).values(
      entries.map((entry) => ({
        orgId,
        supportTicketId: ticketId,
        userId,
        action: entry.action,
        fromValue: entry.fromValue,
        toValue: entry.toValue,
      }))
    );
  } catch (activityError) {
    logger.error("Failed to log support ticket activity", {
      ticketId,
      error:
        activityError instanceof Error
          ? activityError.message
          : String(activityError),
    });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ supportTicketId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { supportTicketId: id } = await params;
      const ticketId = Number(id);
      if (!Number.isFinite(ticketId)) return err("Invalid ID", 400);

      const ticket = await getSupportTicket(session.orgId, ticketId);
      if (!ticket) return err("Ticket not found", 404);
      return ok(ticket);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load ticket",
        500
      );
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ supportTicketId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { supportTicketId: id } = await params;
      const ticketId = Number(id);
      if (!Number.isFinite(ticketId)) return err("Invalid ID", 400);

      const ticket = await db.query.supportTickets.findFirst({
        where: and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.orgId, session.orgId)
        ),
      });
      if (!ticket) return err("Ticket not found", 404);

      const body = await req.json();
      const input = updateSchema.parse(body);

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.status) {
        updateData.status = input.status;
        if (input.status === "RESOLVED") updateData.resolvedAt = new Date();
        if (input.status === "CLOSED") updateData.closedAt = new Date();
      }
      if (input.priority) updateData.priority = input.priority;
      if (input.assigneeId !== undefined)
        updateData.assigneeId = input.assigneeId;

      await db
        .update(supportTickets)
        .set(updateData)
        .where(
          and(
            eq(supportTickets.id, ticketId),
            eq(supportTickets.orgId, session.orgId)
          )
        );

      await logTicketActivity(session.orgId, ticketId, session.user.id, ticket, input);

      await invalidateCachePattern(`support:tickets:${session.orgId}:*`);

      if (input.status) {
        void (async () => {
          const creator = await db.query.users.findFirst({
            where: eq(users.id, ticket.createdBy),
            columns: { email: true, name: true },
          });
          if (creator?.email) {
            await sendSupportTicketStatusEmail(
              creator.email,
              creator.name ?? "User",
              ticket.title,
              ticketId,
              input.status!,
              session.user.name ?? "Support"
            );
          }
        })().catch((emailError) => {
          logger.error("Support status notification email failed", {
            ticketId,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          });
        });
      }

      if (input.assigneeId && input.assigneeId !== ticket.assigneeId) {
        void (async () => {
          const assignee = await db.query.users.findFirst({
            where: eq(users.id, input.assigneeId!),
            columns: { email: true, name: true },
          });
          if (assignee?.email) {
            await sendSupportTicketCreatedEmail(
              assignee.email,
              assignee.name ?? "Team Member",
              ticket.title,
              ticket.priority ?? "MEDIUM",
              session.user.name ?? "Support",
              ticketId
            );
          }
        })().catch((emailError) => {
          logger.error("Support assignment notification email failed", {
            ticketId,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          });
        });
      }

      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update ticket",
        500
      );
    }
  });
}
