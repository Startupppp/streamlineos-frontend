import { withAbility, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { bonuses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bonusId: string }> }
) {
  return withAbility("manage", "hr:bonuses", async (session) => {
    const { bonusId: id } = await params;
    const bonusId = Number(id);
    if (isNaN(bonusId)) return err("Invalid bonus ID.", 400);

    const body = patchSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(bonuses)
      .where(
        and(
          eq(bonuses.id, bonusId),
          eq(bonuses.orgId, session.orgId)
        )
      );

    if (!existing) return err("Bonus not found.", 404);
    if (existing.status !== "PENDING") return err("Bonus has already been processed.", 400);

    const [updated] = await db
      .update(bonuses)
      .set({
        status: body.status,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .where(eq(bonuses.id, bonusId))
      .returning();

    return ok(updated);
  });
}
