import { withAbility, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { okrGoals } from "@/lib/db/schema";
import { eq, count, avg } from "drizzle-orm";

type GoalStatus = "not_started" | "on_track" | "at_risk" | "off_track" | "completed";

const STATUS_KEYS: GoalStatus[] = ["not_started", "on_track", "at_risk", "off_track", "completed"];

export async function GET() {
  return withAbility("view", "projects:goals", async (session) => {
    const rows = await db
      .select({
        status: okrGoals.status,
        statusCount: count(),
        avgProgress: avg(okrGoals.progress),
      })
      .from(okrGoals)
      .where(eq(okrGoals.orgId, session.orgId))
      .groupBy(okrGoals.status);

    const byStatus = STATUS_KEYS.reduce<Record<GoalStatus, number>>(
      (acc, key) => {
        acc[key] = 0;
        return acc;
      },
      { not_started: 0, on_track: 0, at_risk: 0, off_track: 0, completed: 0 },
    );

    let total = 0;
    let progressSum = 0;
    for (const row of rows) {
      byStatus[row.status] = row.statusCount;
      total += row.statusCount;
      progressSum += parseFloat(row.avgProgress ?? "0") * row.statusCount;
    }

    const avgProgress = total > 0 ? Math.round(progressSum / total) : 0;

    return ok({
      total,
      byStatus,
      avgProgress,
      atRisk: byStatus.at_risk + byStatus.off_track,
      completed: byStatus.completed,
    });
  });
}
