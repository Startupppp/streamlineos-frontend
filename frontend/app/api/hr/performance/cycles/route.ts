import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { reviewCycles } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createReviewCycleSchema } from "@/lib/validation/hr";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.reviewCycles.findMany({
      where: eq(reviewCycles.orgId, session.orgId),
      orderBy: [desc(reviewCycles.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:performance")) {
      return err("Only admins can create review cycles.", 403);
    }
    const body = await parseBody(req, createReviewCycleSchema);

    const existingCycle = await db.query.reviewCycles.findFirst({
      where: and(eq(reviewCycles.orgId, session.orgId), eq(reviewCycles.name, body.name)),
      columns: { id: true },
    });
    if (existingCycle) {
      return err(`A review cycle named "${body.name}" already exists.`, 409);
    }

    const [cycle] = await db
      .insert(reviewCycles)
      .values({
        orgId: session.orgId,
        name: body.name,
        type: body.type,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        deadline: body.deadline,
        description: body.description,
        status: "DRAFT",
        createdBy: session.user.id,
      })
      .returning();

    void import("@/lib/services/automation/engine").then(({ runAutomationsForEvent }) =>
      runAutomationsForEvent(session.orgId, "performance.review_cycle_started", {
        cycleId: cycle.id,
        cycleName: cycle.name,
        startDate: cycle.periodStart,
        endDate: cycle.periodEnd,
        reviewerCount: 0,
      })
    );

    return ok(cycle, 201);
  });
}
