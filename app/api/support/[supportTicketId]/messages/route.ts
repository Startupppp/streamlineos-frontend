import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { supportTickets, supportTicketMessages, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { sendSupportTicketReplyEmail } from "@/lib/email";

const replySchema = z.object({
  body: z.string().min(1),
  isInternal: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })
    )
    .optional(),
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

      const ticket = await db.query.supportTickets.findFirst({
        where: and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.orgId, session.orgId)
        ),
      });
      if (!ticket) return err("Ticket not found", 404);

      const messages = await db.query.supportTicketMessages.findMany({
        where: eq(supportTicketMessages.ticketId, ticketId),
        with: {
          author: { columns: { id: true, name: true, image: true } },
        },
        orderBy: [desc(supportTicketMessages.createdAt)],
      });

      return ok(messages);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load messages",
        500
      );
    }
  });
}

export async function POST(
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
      const input = replySchema.parse(body);

      const [message] = await db
        .insert(supportTicketMessages)
        .values({
          ticketId,
          authorId: session.user.id,
          body: input.body,
          isInternal: input.isInternal,
          attachments: input.attachments ?? [],
        })
        .returning();

      if (ticket.status === "OPEN") {
        await db
          .update(supportTickets)
          .set({ status: "IN_PROGRESS", updatedAt: new Date() })
          .where(
            and(
              eq(supportTickets.id, ticketId),
              eq(supportTickets.orgId, session.orgId)
            )
          );
      }

      if (!input.isInternal) {
        void (async () => {
          const notifyUserId =
            session.user.id === ticket.createdBy
              ? ticket.assigneeId
              : ticket.createdBy;

          if (!notifyUserId) return;

          const [recipient, author] = await Promise.all([
            db.query.users.findFirst({
              where: eq(users.id, notifyUserId),
              columns: { email: true, name: true },
            }),
            db.query.users.findFirst({
              where: eq(users.id, session.user.id),
              columns: { name: true },
            }),
          ]);

          if (recipient?.email) {
            await sendSupportTicketReplyEmail(
              recipient.email,
              recipient.name ?? "User",
              ticket.title,
              ticketId,
              author?.name ?? session.user.name ?? "Team Member",
              input.body
            );
          }
        })().catch(() => {});
      }

      return ok(message, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to add message",
        500
      );
    }
  });
}
