import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateReferrals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  status: z.enum(["SUBMITTED", "REVIEWING", "HIRED", "REJECTED", "BONUS_PAID"]).optional(),
  bonusAmount: z.number().positive().optional(),
  bonusEligible: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

type RouteContext = { params: Promise<{ referralId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const { referralId } = await params;
    const id = Number(referralId);
    if (!Number.isFinite(id)) return err("Invalid referral ID", 400);

    const body = await parseBody(req, updateSchema);

    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.status === "BONUS_PAID") {
      updates.bonusPaidAt = new Date();
    }

    const [updated] = await db
      .update(candidateReferrals)
      .set(updates)
      .where(and(eq(candidateReferrals.id, id), eq(candidateReferrals.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Referral not found", 404);
    return ok(updated);
  });
}
