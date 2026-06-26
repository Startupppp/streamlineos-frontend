import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { okrGoals, okrKeyResults } from "@/lib/db/schema";

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function keyResultPercent(kr: {
  metricType: "number" | "percentage" | "currency" | "boolean";
  startValue: string;
  targetValue: string;
  currentValue: string;
}): number {
  if (kr.metricType === "boolean") {
    return parseFloat(kr.currentValue) >= 1 ? 100 : 0;
  }
  const start = parseFloat(kr.startValue);
  const target = parseFloat(kr.targetValue);
  const current = parseFloat(kr.currentValue);
  const denominator = target - start;
  if (denominator === 0) {
    return current >= target ? 100 : 0;
  }
  return clamp(((current - start) / denominator) * 100, 0, 100);
}

export async function recomputeGoalProgress(goalId: number, orgId: string): Promise<number | null> {
  return db.transaction(async (tx) => {
    const keyResults = await tx.query.okrKeyResults.findMany({
      where: and(eq(okrKeyResults.goalId, goalId), eq(okrKeyResults.orgId, orgId)),
      columns: {
        metricType: true,
        startValue: true,
        targetValue: true,
        currentValue: true,
      },
    });

    if (keyResults.length === 0) {
      return null;
    }

    const total = keyResults.reduce((sum, kr) => sum + keyResultPercent(kr), 0);
    const progress = Math.round(total / keyResults.length);

    await tx
      .update(okrGoals)
      .set({ progress, updatedAt: new Date() })
      .where(and(eq(okrGoals.id, goalId), eq(okrGoals.orgId, orgId)));

    return progress;
  });
}
