import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { bonuses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bonusId: string }> }
) {
  return withAbility("manage", "hr:bonuses", async (session) => {
    const { bonusId: id } = await params;
    const bonusId = Number(id);
    if (isNaN(bonusId)) return err("Invalid bonus ID.", 400);

    const body = await parseBody(req, patchSchema);

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
    if (existing.status === "PAID") return err("Bonus has already been paid.", 400);
    if (body.status === "PAID" && existing.status === "REJECTED") return err("Cannot mark a rejected bonus as paid.", 400);

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
