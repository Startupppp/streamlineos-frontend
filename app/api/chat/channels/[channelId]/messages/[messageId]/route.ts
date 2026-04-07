/**
 * PATCH  /api/chat/channels/[id]/messages/[messageId]  — edit a message
 * DELETE /api/chat/channels/[id]/messages/[messageId]  — delete (soft) a message
 */

import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const editMessageSchema = z.object({
  content: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  return withAuth(async (session) => {
    const { messageId } = await params;
    const msgId = Number(messageId);
    if (!Number.isFinite(msgId)) return err("Invalid message id", 400);

    let body: z.infer<typeof editMessageSchema>;
    try {
      body = await parseBody(req, editMessageSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    await db
      .update(chatMessages)
      .set({
        content: body.content.trim(),
        isEdited: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chatMessages.id, msgId),
          eq(chatMessages.senderId, session.user.id)
        )
      );

    return ok({ ok: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  return withAuth(async (session) => {
    const { messageId } = await params;
    const msgId = Number(messageId);
    if (!Number.isFinite(msgId)) return err("Invalid message id", 400);

    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR";

    const conditions = [eq(chatMessages.id, msgId)];
    if (!isAdmin) {
      conditions.push(eq(chatMessages.senderId, session.user.id));
    }

    await db
      .update(chatMessages)
      .set({ isDeleted: true, content: null, updatedAt: new Date() })
      .where(and(...conditions));

    return ok({ ok: true });
  });
}
