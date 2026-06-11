import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { reviewCycles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateReviewCycleSchema } from "@/lib/validations/hr";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  return withAuth(async (session) => {
    const { cycleId: id } = await params;
    const cycleId = Number(id);
    if (!cycleId) return err("Invalid cycle ID.", 400);

    const cycle = await db.query.reviewCycles.findFirst({
      where: and(eq(reviewCycles.id, cycleId), eq(reviewCycles.orgId, session.orgId)),
      with: { reviews: true },
    });
    if (!cycle) return err("Review cycle not found.", 404);
    return ok(cycle);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:performance"))  return err("Forbidden.", 403);
    const { cycleId: id } = await params;
    const cycleId = Number(id);
    if (!cycleId) return err("Invalid cycle ID.", 400);

    const existing = await db.query.reviewCycles.findFirst({
      where: and(eq(reviewCycles.id, cycleId), eq(reviewCycles.orgId, session.orgId)),
    });
    if (!existing) return err("Review cycle not found.", 404);

    const body = await parseBody(req, updateReviewCycleSchema);
    await db.update(reviewCycles).set({ ...body, updatedAt: new Date() }).where(eq(reviewCycles.id, cycleId));
    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:performance"))  return err("Forbidden.", 403);
    const { cycleId: id } = await params;
    const cycleId = Number(id);
    if (!cycleId) return err("Invalid cycle ID.", 400);

    await db.delete(reviewCycles).where(
      and(eq(reviewCycles.id, cycleId), eq(reviewCycles.orgId, session.orgId))
    );
    return ok({ success: true });
  });
}
