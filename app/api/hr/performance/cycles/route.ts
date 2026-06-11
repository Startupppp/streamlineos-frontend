import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { reviewCycles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createReviewCycleSchema } from "@/lib/validations/hr";
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
    return ok(cycle, 201);
  });
}
