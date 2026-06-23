import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { candidateOffers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
  declineReason: z.string().max(1000).optional(),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  let body: z.infer<typeof respondSchema>;
  try {
    body = respondSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const offer = await db.query.candidateOffers.findFirst({
    where: eq(candidateOffers.acceptanceToken, token),
    columns: { id: true, offerStatus: true, acceptanceTokenExpiresAt: true },
  });

  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  if (offer.acceptanceTokenExpiresAt && new Date(offer.acceptanceTokenExpiresAt) < new Date()) {
    return NextResponse.json({ error: "This offer link has expired." }, { status: 410 });
  }

  if (offer.offerStatus !== "SENT" && offer.offerStatus !== "VIEWED") {
    return NextResponse.json({ error: "This offer can no longer be responded to." }, { status: 409 });
  }

  const newStatus = body.action === "accept" ? "ACCEPTED" : "DECLINED";

  await db
    .update(candidateOffers)
    .set({
      offerStatus: newStatus,
      respondedAt: new Date(),
      notes: body.declineReason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(candidateOffers.id, offer.id));

  return NextResponse.json({ success: true, status: newStatus });
}
