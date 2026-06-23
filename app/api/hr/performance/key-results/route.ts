import { withAuth, ok, err, parseBody } from "@/lib/api/helpers"; 
import { db } from "@/lib/db";
import { keyResults, goals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  goalId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  targetValue: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  currentValue: z.number().min(0).optional(),
  progress: z.number().min(0).max(100).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const goalId = Number(req.nextUrl.searchParams.get("goalId"));
    if (!goalId) return err("goalId is required.", 400);

    const goal = await db.query.goals.findFirst({
      where: and(eq(goals.id, goalId), eq(goals.orgId, session.orgId)),
    });
    if (!goal) return err("Goal not found.", 404);

    const data = await db.query.keyResults.findMany({
      where: eq(keyResults.goalId, goalId),
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);
    const goal = await db.query.goals.findFirst({
      where: and(eq(goals.id, body.goalId), eq(goals.orgId, session.orgId)),
    });
    if (!goal) return err("Goal not found.", 404);

    const [kr] = await db.insert(keyResults).values({
      goalId: body.goalId,
      title: body.title,
      targetValue: body.targetValue?.toString(),
      unit: body.unit,
    }).returning();
    return ok(kr, 201);
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, updateSchema);
    await db.update(keyResults).set({
      ...(body.currentValue !== undefined && { currentValue: body.currentValue.toString() }),
      ...(body.progress !== undefined && { progress: body.progress }),
      updatedAt: new Date(),
    }).where(eq(keyResults.id, body.id));
    return ok({ success: true });
  });
}
