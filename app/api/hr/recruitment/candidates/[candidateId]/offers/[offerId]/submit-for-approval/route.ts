import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

type RouteParams = { params: Promise<{ candidateId: string; offerId: string }> };

export async function POST(
  _req: NextRequest,
  { params }: RouteParams
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "HR" && role !== "ADMIN") {
      return err("Only HR or Admin can submit offers for approval.", 403);
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
    if (offer.offerStatus !== "DRAFT") {
      return err("Only DRAFT offers can be submitted for approval.", 400);
    }

    await db
      .update(candidateOffers)
      .set({ offerStatus: "PENDING_APPROVAL", updatedAt: new Date() })
      .where(eq(candidateOffers.id, offerId));

    return ok({ success: true });
  });
}
