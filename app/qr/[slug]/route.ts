
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return new Response("Invalid QR Code", { status: 400 });
  }

  const qrCode = await db.query.qrCodes.findFirst({
    where: eq(qrCodes.slug, slug),
  });

  if (!qrCode) {
    return new Response("QR Code not found", { status: 404 });
  }

  // Increment scan count
  // Fire and forget - don't block redirect on this update? 
  // Ideally we should block to ensure accurate counting, but for speed we might not want to.
  // For now, let's await it to be safe.
  await db
    .update(qrCodes)
    .set({
      scanCount: sql`${qrCodes.scanCount} + 1`,
    })
    .where(eq(qrCodes.id, qrCode.id));

  redirect(qrCode.targetUrl);
}
