

import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  chatChannels,
  chatChannelMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getMyChannels } from "@/server/queries/chat";
import { z } from "zod";

const createChannelSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("DIRECT"),
    targetUserId: z.string().min(1),
  }),
  z.object({
    type: z.literal("GROUP"),
    name: z.string().min(1),
    description: z.string().optional(),
    avatarUrl: z.string().optional(),
    memberIds: z.array(z.string()).min(1),
  }),
]);

export async function GET() {
  return withAuth(async (session) => {
    const channels = await getMyChannels(session.user.id, session.orgId);
    return ok(channels);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const userId = session.user.id;
    const orgId = session.orgId;

    let body: z.infer<typeof createChannelSchema>;
    try {
      body = await parseBody(req, createChannelSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    if (body.type === "DIRECT") {
      const { targetUserId } = body;

      const myMemberships = await db
        .select({ channelId: chatChannelMembers.channelId })
        .from(chatChannelMembers)
        .where(eq(chatChannelMembers.userId, userId));

      if (myMemberships.length > 0) {
        const channelIds = myMemberships.map((c) => c.channelId);
        const existingDMs = await db.query.chatChannels.findMany({
          where: and(
            inArray(chatChannels.id, channelIds),
            eq(chatChannels.type, "DIRECT"),
            eq(chatChannels.orgId, orgId)
          ),
          with: { members: true },
        });

        const dmChannel = existingDMs.find(
          (ch) =>
            ch.members.length === 2 &&
            ch.members.some((m) => m.userId === targetUserId)
        );

        if (dmChannel) return ok(dmChannel);
      }

      const [targetUser, currentUser] = await Promise.all([
        db.query.users.findFirst({
          where: eq(users.id, targetUserId),
          columns: { name: true },
        }),
        db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { name: true },
        }),
      ]);

      const [channel] = await db
        .insert(chatChannels)
        .values({
          orgId,
          name: `${currentUser?.name ?? "User"} & ${targetUser?.name ?? "User"}`,
          type: "DIRECT",
          createdBy: userId,
        })
        .returning();

      await db.insert(chatChannelMembers).values([
        { channelId: channel.id, userId, role: "MEMBER" },
        { channelId: channel.id, userId: targetUserId, role: "MEMBER" },
      ]);

      return ok(channel, 201);
    }

    const { name, description, avatarUrl, memberIds } = body;

    const [channel] = await db
      .insert(chatChannels)
      .values({
        orgId,
        name,
        type: "GROUP",
        description,
        avatarUrl,
        createdBy: userId,
      })
      .returning();

    const allMembers = [...new Set([userId, ...memberIds])];
    await db.insert(chatChannelMembers).values(
      allMembers.map((uid) => ({
        channelId: channel.id,
        userId: uid,
        role: uid === userId ? ("ADMIN" as const) : ("MEMBER" as const),
      }))
    );

    return ok(channel, 201);
  });
}
