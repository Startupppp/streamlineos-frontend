

import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatChannelMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const requesterMembership = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });

    if (!requesterMembership) {
      return err("You are not a member of this channel", 403);
    }

    const members = await db.query.chatChannelMembers.findMany({
      where: eq(chatChannelMembers.channelId, channelId),
      with: {
        user: {
          columns: { id: true, name: true, image: true, email: true, role: true },
        },
      },
    });

    return ok(members);
  });
}
