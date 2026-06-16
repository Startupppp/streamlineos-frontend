import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { invalidateCache, CACHE_KEYS } from "@/lib/cache";
import { db } from "@/lib/db";
import { commissions, deals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createNotification } from "@/server/actions/create-notification";

const updateSchema = z.object({
  status: z.enum(["approved", "paid"]),
});

type RouteContext = { params: Promise<{ commissionId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "sales", async (session) => {
    const { commissionId: idStr } = await ctx.params;
    const commissionId = Number(idStr);
    if (!Number.isFinite(commissionId)) return err("Invalid commission ID", 400);

    const { status } = await parseBody(req, updateSchema);

    const [existing] = await db
      .select({
        id: commissions.id,
        status: commissions.status,
        userId: commissions.userId,
        dealId: commissions.dealId,
        commissionAmount: commissions.commissionAmount,
      })
      .from(commissions)
      .where(and(eq(commissions.id, commissionId), eq(commissions.orgId, session.orgId)))
      .limit(1);

    if (!existing) return err("Commission not found", 404);
    if (existing.status !== "pending") {
      return err("Only pending commissions can be updated", 409);
    }

    const [updated] = await db
      .update(commissions)
      .set({
        status,
        paidAt: status === "paid" ? new Date() : null,
      })
      .where(and(eq(commissions.id, commissionId), eq(commissions.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Commission not found", 404);

    await invalidateCache(CACHE_KEYS.commissionsList(session.orgId));

    const [deal] = await db
      .select({ name: deals.name })
      .from(deals)
      .where(eq(deals.id, existing.dealId))
      .limit(1);

    await createNotification({
      orgId: session.orgId,
      userId: existing.userId,
      type: "SUCCESS",
      title: status === "paid" ? "Commission paid" : "Commission approved",
      message: `Your commission${deal?.name ? ` for ${deal.name}` : ""} of ₹${Number(existing.commissionAmount).toLocaleString("en-IN")} was ${status}.`,
      link: "/sales/commissions",
    });

    return ok(updated);
  });
}
