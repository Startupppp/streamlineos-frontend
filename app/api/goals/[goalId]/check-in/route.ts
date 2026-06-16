import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { okrGoals, okrKeyResults, okrUpdates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { recomputeGoalProgress } from "@/lib/services/goals";

const checkInSchema = z.object({
  keyResultId: z.number().int(),
  newValue: z.number(),
  note: z.string().max(1000).optional(),
});

type RouteContext = { params: Promise<{ goalId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:goals", async (session) => {
    const { goalId: idStr } = await ctx.params;
    const goalId = Number(idStr);
    if (!Number.isFinite(goalId)) return err("Invalid goal ID", 400);

    const input = await parseBody(req, checkInSchema);

    const keyResult = await db.query.okrKeyResults.findFirst({
      where: and(
        eq(okrKeyResults.id, input.keyResultId),
        eq(okrKeyResults.goalId, goalId),
        eq(okrKeyResults.orgId, session.orgId),
      ),
      columns: { id: true, currentValue: true },
    });
    if (!keyResult) return err("Key result not found", 404);

    const previousValue = keyResult.currentValue;
    const newValue = input.newValue.toString();

    await db.transaction(async (tx) => {
      await tx
        .update(okrKeyResults)
        .set({ currentValue: newValue, updatedAt: new Date() })
        .where(and(eq(okrKeyResults.id, input.keyResultId), eq(okrKeyResults.orgId, session.orgId)));

      await tx.insert(okrUpdates).values({
        orgId: session.orgId,
        goalId,
        keyResultId: input.keyResultId,
        note: input.note ?? null,
        previousValue,
        newValue,
        userId: session.user.id,
      });
    });

    await recomputeGoalProgress(goalId, session.orgId);

    const goal = await db.query.okrGoals.findFirst({
      where: and(eq(okrGoals.id, goalId), eq(okrGoals.orgId, session.orgId)),
    });

    return ok(goal);
  });
}
