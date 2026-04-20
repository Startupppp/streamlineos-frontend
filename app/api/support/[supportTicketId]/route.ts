import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSupportTicket } from "@/server/queries/support";
import { db } from "@/lib/db";
import { supportTickets, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendSupportTicketStatusEmail, sendSupportTicketCreatedEmail } from "@/lib/email";

const updateSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])
    .optional(),
  assigneeId: z.string().optional(),
});

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
        })().catch(() => {});
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
        })().catch(() => {});
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
