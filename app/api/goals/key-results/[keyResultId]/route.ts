import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { okrKeyResults } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { recomputeGoalProgress } from "@/lib/services/goals";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  metricType: z.enum(["number", "percentage", "currency", "boolean"]).optional(),
  startValue: z.number().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().max(50).nullable().optional(),
  status: z.enum(["not_started", "on_track", "at_risk", "off_track", "completed"]).optional(),
});

type RouteContext = { params: Promise<{ keyResultId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:goals", async (session) => {
    const { keyResultId: idStr } = await ctx.params;
    const keyResultId = Number(idStr);
    if (!Number.isFinite(keyResultId)) return err("Invalid key result ID", 400);

    const existing = await db.query.okrKeyResults.findFirst({
      where: and(eq(okrKeyResults.id, keyResultId), eq(okrKeyResults.orgId, session.orgId)),
      columns: { id: true, goalId: true },
    });
    if (!existing) return err("Key result not found", 404);

    const input = await parseBody(req, updateSchema);

    const fields: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) fields.title = input.title;
    if (input.metricType !== undefined) fields.metricType = input.metricType;
    if (input.startValue !== undefined) fields.startValue = input.startValue.toString();
    if (input.targetValue !== undefined) fields.targetValue = input.targetValue.toString();
    if (input.currentValue !== undefined) fields.currentValue = input.currentValue.toString();
    if (input.unit !== undefined) fields.unit = input.unit;
    if (input.status !== undefined) fields.status = input.status;

    const [updated] = await db
      .update(okrKeyResults)
      .set(fields)
      .where(and(eq(okrKeyResults.id, keyResultId), eq(okrKeyResults.orgId, session.orgId)))
      .returning();

    await recomputeGoalProgress(existing.goalId, session.orgId);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:goals", async (session) => {
    const { keyResultId: idStr } = await ctx.params;
    const keyResultId = Number(idStr);
    if (!Number.isFinite(keyResultId)) return err("Invalid key result ID", 400);

    const existing = await db.query.okrKeyResults.findFirst({
      where: and(eq(okrKeyResults.id, keyResultId), eq(okrKeyResults.orgId, session.orgId)),
      columns: { id: true, goalId: true },
    });
    if (!existing) return err("Key result not found", 404);

    await db
      .delete(okrKeyResults)
      .where(and(eq(okrKeyResults.id, keyResultId), eq(okrKeyResults.orgId, session.orgId)));

    await recomputeGoalProgress(existing.goalId, session.orgId);

    return ok({ success: true });
  });
}
