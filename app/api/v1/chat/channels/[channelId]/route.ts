/**
 * GET   /api/v1/chat/channels/[id]  — get channel detail
 * PATCH /api/v1/chat/channels/[id]  — update channel (admin only)
 */

import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatChannels, chatChannelMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getChannel } from "@/server/queries/chat";
import { z } from "zod";

const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    try {
      const channel = await getChannel(channelId, session.user.id);
      if (!channel) return err("Channel not found", 404);
      return ok(channel);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "FORBIDDEN") {
        return err("You are not a member of this channel", 403);
      }
      throw e;
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    // Verify admin membership
    const membership = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });

    if (!membership) return err("You are not a member of this channel", 403);
    if (membership.role !== "ADMIN") {
      return err("Only channel admins can update channel details", 403);
    }

    let body: z.infer<typeof updateChannelSchema>;
    try {
      body = await parseBody(req, updateChannelSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;

    await db
      .update(chatChannels)
      .set(updateData)
      .where(eq(chatChannels.id, channelId));

    return ok({ ok: true });
  });
}
