

import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const editMessageSchema = z.object({
  content: z.string().min(1),
});

const EDIT_WINDOW_MS =
  Number(process.env.CHAT_MESSAGE_EDIT_WINDOW_MS) ||
  Number(process.env.NEXT_PUBLIC_CHAT_MESSAGE_EDIT_WINDOW_MS) ||
  3_600_000;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId, messageId } = await params;
    const channelIdNum = Number(channelId);
    const msgId = Number(messageId);
    if (!Number.isFinite(channelIdNum) || !Number.isFinite(msgId)) {
      return err("Invalid message id", 400);
    }

    let body: z.infer<typeof editMessageSchema>;
    try {
      body = await parseBody(req, editMessageSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const [existing] = await db
      .select({
        id: chatMessages.id,
        senderId: chatMessages.senderId,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.id, msgId),
          eq(chatMessages.channelId, channelIdNum)
        )
      )
      .limit(1);

    if (!existing) return err("Message not found", 404);
    if (existing.senderId !== session.user.id) {
      return err("You can only edit your own messages", 403);
    }

    const createdMs = existing.createdAt
      ? new Date(existing.createdAt).getTime()
      : 0;
    if (Date.now() - createdMs > EDIT_WINDOW_MS) {
      return err("Edit window has expired for this message", 400);
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
          eq(chatMessages.channelId, channelIdNum),
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
    const { channelId, messageId } = await params;
    const channelIdNum = Number(channelId);
    const msgId = Number(messageId);
    if (!Number.isFinite(channelIdNum) || !Number.isFinite(msgId)) {
      return err("Invalid message id", 400);
    }

    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR";

    const conditions = [
      eq(chatMessages.id, msgId),
      eq(chatMessages.channelId, channelIdNum),
    ];
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
