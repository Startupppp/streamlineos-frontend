import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { okrGoals, okrKeyResults } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { recomputeGoalProgress } from "@/lib/services/goals";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  metricType: z.enum(["number", "percentage", "currency", "boolean"]).default("number"),
  startValue: z.number().default(0),
  targetValue: z.number(),
  currentValue: z.number().default(0),
  unit: z.string().max(50).optional(),
  status: z.enum(["not_started", "on_track", "at_risk", "off_track", "completed"]).default("not_started"),
});

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "projects:goals", async (session) => {
    const { goalId: idStr } = await ctx.params;
    const goalId = Number(idStr);
    if (!Number.isFinite(goalId)) return err("Invalid goal ID", 400);

    const keyResults = await db.query.okrKeyResults.findMany({
      where: and(eq(okrKeyResults.goalId, goalId), eq(okrKeyResults.orgId, session.orgId)),
      orderBy: [okrKeyResults.id],
    });

    return ok(keyResults);
  });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:goals", async (session) => {
    const { goalId: idStr } = await ctx.params;
    const goalId = Number(idStr);
    if (!Number.isFinite(goalId)) return err("Invalid goal ID", 400);

    const goal = await db.query.okrGoals.findFirst({
      where: and(eq(okrGoals.id, goalId), eq(okrGoals.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!goal) return err("Goal not found", 404);

    const input = await parseBody(req, createSchema);

    const [keyResult] = await db
      .insert(okrKeyResults)
      .values({
        orgId: session.orgId,
        goalId,
        title: input.title,
        metricType: input.metricType,
        startValue: input.startValue.toString(),
        targetValue: input.targetValue.toString(),
        currentValue: input.currentValue.toString(),
        unit: input.unit ?? null,
        status: input.status,
      })
      .returning();

    await recomputeGoalProgress(goalId, session.orgId);

    return ok(keyResult, 201);
  });
}
