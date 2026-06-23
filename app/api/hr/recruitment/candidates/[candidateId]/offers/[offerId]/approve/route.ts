import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const approveSchema = z.object({
  remarks: z.string().max(2000).optional(),
});

type RouteParams = { params: Promise<{ candidateId: string; offerId: string }> };

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  return withAuth(async (session) => {
    if (session.user.role !== "CEO") {
      return err("Only CEO can approve offers.", 403);
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
      return err("Only PENDING_APPROVAL offers can be approved.", 400);
    }

    const body = await parseBody(req, approveSchema);

    await db
      .update(candidateOffers)
      .set({
        offerStatus: "SENT",
        approvedBy: session.user.id,
        approvedAt: new Date(),
        approvalRemarks: body.remarks ?? null,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(candidateOffers.id, offerId));

    return ok({ success: true });
  });
}
