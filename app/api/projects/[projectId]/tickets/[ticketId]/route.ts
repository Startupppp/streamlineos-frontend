import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  tickets,
  ticketAssignees,
  ticketComments,
  ticketAttachments,
  ticketLabelMappings,
  ticketWatchers,
  timesheets,
  workItemRelations,
} from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { updateTicket, updateTicketSchema } from "@/lib/services/ticket-update";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId: rawTicketId } = await params;
    const ticketId = Number(rawTicketId);
    if (!ticketId) return err("Invalid ticket id", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.orgId, session.orgId)),
      with: {
        project: true,
        sprint: true,
        assignee: true,
        reporter: true,
        assignees: { with: { user: true } },
        comments: { with: { user: true }, orderBy: [desc(ticketComments.createdAt)] },
        attachments: { with: { uploader: true } },
        labels: { with: { label: true } },
      },
    });

    if (!ticket) return err("Ticket not found", 404);

    const ability = await getSessionAbility();
    if (!ability.can("manage", "projects")) {
      const isAssignee =
        ticket.assigneeId === session.user.id ||
        ticket.assignees.some((a) => a.userId === session.user.id);
      const isReporter = ticket.reporterId === session.user.id;
      if (!isAssignee && !isReporter) {
        return err("You don't have access to this ticket's details.", 403);
      }
    }

    return ok(ticket);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId: rawTicketId } = await params;
    const ticketId = Number(rawTicketId);
    if (!ticketId) return err("Invalid ticket id", 400);

    const input = await parseBody(req, updateTicketSchema);

    await updateTicket(
      session.orgId,
      session.user.id,
      session.user.name ?? "Team Member",
      ticketId,
      input,
    );

    return ok({ updated: true });
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId: rawTicketId } = await params;
    const ticketId = Number(rawTicketId);
    if (!ticketId) return err("Invalid ticket id", 400);
    const force = req.nextUrl.searchParams.get("force") === "true";

    const existing = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!existing) return err("Ticket not found", 404);

    if (!force) {
      const blockedBy = await db.query.workItemRelations.findMany({
        where: and(
          eq(workItemRelations.relatedWorkItemId, ticketId),
          eq(workItemRelations.relationType, "blocks"),
        ),
        columns: { workItemId: true },
      });
      if (blockedBy.length > 0) {
        return err(
          `This ticket is blocked by ${blockedBy.length} other ticket(s). Add ?force=true to delete anyway.`,
          409,
        );
      }
    }

    await db.transaction(async (tx) => {
      await tx.update(tickets).set({ parentTicketId: null }).where(eq(tickets.parentTicketId, ticketId));
      await tx.update(tickets).set({ epicId: null }).where(eq(tickets.epicId, ticketId));

      await tx.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, ticketId));
      await tx.delete(ticketComments).where(eq(ticketComments.ticketId, ticketId));
      await tx.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, ticketId));
      await tx.delete(ticketLabelMappings).where(eq(ticketLabelMappings.ticketId, ticketId));
      await tx.delete(ticketWatchers).where(eq(ticketWatchers.ticketId, ticketId));
      await tx.delete(timesheets).where(eq(timesheets.ticketId, ticketId));
      await tx.delete(workItemRelations).where(
        or(eq(workItemRelations.workItemId, ticketId), eq(workItemRelations.relatedWorkItemId, ticketId)),
      );

      await tx.delete(tickets).where(eq(tickets.id, ticketId));
    });

    return ok({ deleted: true });
  });
}
