import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { commissions, users, deals } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const listSchema = z.object({
  userId: z.string().optional(),
  status: z.enum(["pending", "approved", "paid"]).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

/** GET /api/sales/commissions — List commissions with optional filters */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { userId, status, limit } = parseQuery(req, listSchema);

    const conditions = [eq(commissions.orgId, session.orgId)];
    if (userId) conditions.push(eq(commissions.userId, userId));
    if (status) conditions.push(eq(commissions.status, status));

    const results = await db
      .select({
        id: commissions.id,
        userId: commissions.userId,
        userName: users.name,
        dealId: commissions.dealId,
        dealName: deals.name,
        dealValue: commissions.dealValue,
        commissionRate: commissions.commissionRate,
        commissionAmount: commissions.commissionAmount,
        status: commissions.status,
        paidAt: commissions.paidAt,
        createdAt: commissions.createdAt,
      })
      .from(commissions)
      .leftJoin(users, eq(commissions.userId, users.id))
      .leftJoin(deals, eq(commissions.dealId, deals.id))
      .where(and(...conditions))
      .orderBy(desc(commissions.createdAt))
      .limit(limit ?? 25);

    // Summary stats
    const totalPending = results.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.commissionAmount), 0);
    const totalPaid = results.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.commissionAmount), 0);

    return ok({ items: results, totalPending, totalPaid });
  });
}
