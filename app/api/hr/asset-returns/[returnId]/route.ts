import { withAbility, ok, err , parseBody} from "@/lib/api/helpers"; 
import { db } from "@/lib/db";
import { assetReturns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const patchSchema = z.object({
  status: z.enum(["RETURNED", "DAMAGED", "LOST"]).default("RETURNED"),
  condition: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ returnId: string }> }
) {
  return withAbility("manage", "hr:assets", async (session) => {
    const { returnId: id } = await params;
    const returnId = Number(id);
    if (isNaN(returnId)) return err("Invalid asset return ID.", 400);

    const body = await parseBody(req, patchSchema);

    const [existing] = await db
      .select()
      .from(assetReturns)
      .where(
        and(
          eq(assetReturns.id, returnId),
          eq(assetReturns.orgId, session.orgId)
        )
      );

    if (!existing) return err("Asset return record not found.", 404);
    if (existing.status === "RETURNED") return err("Asset already marked as returned.", 400);

    const [updated] = await db
      .update(assetReturns)
      .set({
        status: body.status,
        condition: body.condition ?? existing.condition,
        notes: body.notes ?? existing.notes,
        returnedAt: new Date(),
      })
      .where(eq(assetReturns.id, returnId))
      .returning();

    return ok(updated);
  });
}
