/**
 * GET  /api/chat/channels/[id]/messages  — paginated messages (cursor-based)
 * POST /api/chat/channels/[id]/messages  — send a new message
 */

import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  chatMessages,
  chatAttachments,
  chatChannels,
  chatChannelMembers,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getMessages } from "@/server/queries/chat";
import { z } from "zod";

const sendMessageSchema = z.object({
  content: z.string().optional(),
  replyToId: z.number().optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })
    )
    .optional(),
});

async function assertMember(channelId: number, userId: string) {
  const m = await db.query.chatChannelMembers.findFirst({
    where: and(
      eq(chatChannelMembers.channelId, channelId),
      eq(chatChannelMembers.userId, userId)
    ),
  });
  return !!m;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const isMember = await assertMember(channelId, session.user.id);
    if (!isMember) return err("You are not a member of this channel", 403);

    const { searchParams } = req.nextUrl;
    const cursor = toNumber(searchParams.get("cursor"));
    const limit = toNumber(searchParams.get("limit")) ?? 50;

    const result = await getMessages(channelId, cursor, limit);
    return ok(result);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const isMember = await assertMember(channelId, session.user.id);
    if (!isMember) return err("You are not a member of this channel", 403);

    let body: z.infer<typeof sendMessageSchema>;
    try {
      body = await parseBody(req, sendMessageSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    if (!body.content?.trim() && (!body.attachments || body.attachments.length === 0)) {
      return err("Message must have content or attachments", 400);
    }

    const [message] = await db
      .insert(chatMessages)
      .values({
        channelId,
        senderId: session.user.id,
        content: body.content?.trim() || null,
        replyToId: body.replyToId,
      })
      .returning();

    if (body.attachments && body.attachments.length > 0) {
      await db.insert(chatAttachments).values(
        body.attachments.map((a) => ({
          messageId: message.id,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileKey: a.fileKey,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
        }))
      );
    }

    await db
      .update(chatChannels)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(chatChannels.id, channelId));

    return ok(message, 201);
  });
}
