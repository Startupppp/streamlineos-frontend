import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatMessages, chatChannelMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const reactionSchema = z.object({
  emoji: z.string().min(1).max(4),
});

type Ctx = { params: Promise<{ channelId: string; messageId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  return withAuth(async (session) => {
    const { channelId: chId, messageId: msgId } = await ctx.params;
    const channelId = Number(chId);
    const messageId = Number(msgId);

    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);
    if (!Number.isFinite(messageId)) return err("Invalid message id", 400);

    const membership = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });
    if (!membership) return err("You are not a member of this channel", 403);

    let body: z.infer<typeof reactionSchema>;
    try {
      body = await parseBody(req, reactionSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const message = await db.query.chatMessages.findFirst({
      where: and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.channelId, channelId),
        eq(chatMessages.isDeleted, false)
      ),
      columns: { id: true, reactions: true },
    });

    if (!message) return err("Message not found", 404);

    const { emoji } = body;
    const userId = session.user.id;
    const current: Record<string, string[]> = (message.reactions ?? {}) as Record<string, string[]>;

    const withoutUser: Record<string, string[]> = {};
    for (const [key, users] of Object.entries(current)) {
      const filtered = users.filter((id) => id !== userId);
      if (filtered.length > 0) withoutUser[key] = filtered;
    }

    const userHadThisEmoji = (current[emoji] ?? []).includes(userId);

    let updated: Record<string, string[]>;
    if (userHadThisEmoji) {
      updated = withoutUser;
    } else {
      const existing = withoutUser[emoji] ?? [];
      updated = { ...withoutUser, [emoji]: [...existing, userId] };
    }

    await db
      .update(chatMessages)
      .set({ reactions: updated, updatedAt: new Date() })
      .where(eq(chatMessages.id, messageId));

    return ok({ reactions: updated });
  });
}
