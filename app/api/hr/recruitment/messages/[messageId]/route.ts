import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ messageId: string }> };

export async function PATCH(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { messageId } = await params;
    const id = Number(messageId);
    if (!Number.isFinite(id)) return err("Invalid message ID", 400);

    const msg = await db.query.candidateMessages.findFirst({
      where: and(eq(candidateMessages.id, id), eq(candidateMessages.orgId, session.orgId)),
    });
    if (!msg) return err("Message not found", 404);

    const [updated] = await db
      .update(candidateMessages)
      .set({ readAt: new Date() })
      .where(eq(candidateMessages.id, id))
      .returning();

    return ok(updated);
  });
}
