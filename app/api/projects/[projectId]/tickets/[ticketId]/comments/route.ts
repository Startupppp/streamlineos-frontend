import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketComments, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logTicketActivity, processCommentMentions } from "@/lib/services/ticket-activity";
import { logger } from "@/lib/logger";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

const commentSchema = z.object({ content: z.string().min(1) });

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId: tid } = await params;
    const ticketId = Number(tid);
    if (!ticketId) return err("Invalid ticket id", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.orgId, session.orgId)),
      columns: { id: true, title: true, projectId: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const body = await parseBody(req, commentSchema);

    const [comment] = await db
      .insert(ticketComments)
      .values({
        orgId: session.orgId,
        ticketId,
        userId: session.user.id,
        content: body.content,
      })
      .returning();

    try {
      await logTicketActivity(db, {
        orgId: session.orgId,
        ticketId,
        userId: session.user.id,
        action: "comment_added",
      });
    } catch (activityErr) {
      logger.error("Failed to log comment activity", { error: activityErr });
    }

    try {
      await processCommentMentions({
        orgId: session.orgId,
        ticketId,
        ticketTitle: ticket.title,
        projectId: ticket.projectId,
        commentId: comment.id,
        content: body.content,
        authorId: session.user.id,
        authorName: session.user.name ?? "A teammate",
      });
    } catch (mentionErr) {
      logger.error("Failed to process comment mentions", { error: mentionErr });
    }

    return ok(comment, 201);
  });
}
