import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const rejectSchema = z.object({
  remarks: z.string().max(2000).optional(),
});

type RouteParams = { params: Promise<{ candidateId: string; offerId: string }> };

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  return withAuth(async (session) => {
    if (session.user.role !== "CEO") {
      return err("Only CEO can reject offer approvals.", 403);
    }

    const { candidateId: cId, offerId: oId } = await params;
    const candidateId = Number(cId);
    const offerId = Number(oId);
    if (!candidateId || !offerId) return err("Invalid parameters.", 400);

    const offer = await db.query.candidateOffers.findFirst({
      where: and(
        eq(candidateOffers.id, offerId),
        eq(candidateOffers.orgId, session.orgId)
      ),
    });
    if (!offer) return err("Offer not found.", 404);
    if (offer.offerStatus !== "PENDING_APPROVAL") {
      return err("Only PENDING_APPROVAL offers can be rejected.", 400);
    }

    const body = await parseBody(req, rejectSchema);

    await db
      .update(candidateOffers)
      .set({
        offerStatus: "APPROVAL_REJECTED",
        approvalRemarks: body.remarks ?? null,
        updatedAt: new Date(),
      })
      .where(eq(candidateOffers.id, offerId));

    return ok({ success: true });
  });
}
