import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { candidateOffers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const offer = await db.query.candidateOffers.findFirst({
    where: eq(candidateOffers.acceptanceToken, token),
    columns: {
      id: true,
      offerStatus: true,
      offeredSalary: true,
      offeredDesignation: true,
      joiningDate: true,
      validUntil: true,
      notes: true,
      acceptanceTokenExpiresAt: true,
    },
  });

  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  if (offer.acceptanceTokenExpiresAt && new Date(offer.acceptanceTokenExpiresAt) < new Date()) {
    return NextResponse.json({ error: "This offer link has expired." }, { status: 410 });
  }

  return NextResponse.json(offer);
}
