import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { recognitions } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  toUserId: z.string().min(1, "Recipient is required"),
  message: z.string().min(1, "Message is required").max(500),
  category: z.enum(["KUDOS", "TEAMWORK", "INNOVATION", "LEADERSHIP", "ABOVE_AND_BEYOND"]).optional().default("KUDOS"),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.recognitions.findMany({
      where: eq(recognitions.orgId, session.orgId),
      with: { fromUser: true, toUser: true },
      orderBy: [desc(recognitions.createdAt)],
      limit: 100,
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createSchema.parse(await req.json());
    if (body.toUserId === session.user.id) return err("You cannot send kudos to yourself.", 400);

    const existing = await db.query.recognitions.findFirst({
      where: and(
        eq(recognitions.orgId, session.orgId),
        eq(recognitions.fromUserId, session.user.id),
        eq(recognitions.toUserId, body.toUserId),
        eq(recognitions.category, body.category),
      ),
      columns: { id: true },
    });
    if (existing) return err("You have already sent this recognition to this employee.", 409);

    const [recognition] = await db.insert(recognitions).values({
      orgId: session.orgId,
      fromUserId: session.user.id,
      toUserId: body.toUserId,
      message: body.message,
      category: body.category,
    }).returning();

    return ok(recognition, 201);
  });
}
