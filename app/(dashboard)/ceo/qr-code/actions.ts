"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/db/schema";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
// import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

const generateSchema = z.object({
  targetUrl: z.string().url(),
  orgId: z.string(),
});

export async function generateQRCode(formData: FormData) {
  try {
    const rawData = {
      targetUrl: formData.get("targetUrl"),
      orgId: formData.get("orgId"),
    };

    const validatedData = generateSchema.parse(rawData);

    // Generate unique slug
    let slug = nanoid(8);
    const existing = await db.query.qrCodes.findFirst({
        where: eq(qrCodes.slug, slug)
    });

    // Simple retry for collision
    if (existing) {
        slug = nanoid(8);
    }

    const origin = formData.get("origin") as string;
    // If no origin provided (e.g. server-side call), fallback to targetUrl (no tracking) logic or a default domain? 
    // Ideally we need the domain. For now, rely on client passing it.
    // If we are in dev, origin might be localhost.
    
    const urlToEncode = origin ? `${origin}/qr/${slug}` : validatedData.targetUrl;

    // Generate QR Code image buffer
    const qrBuffer = await QRCode.toBuffer(urlToEncode);

    // Convert to Data URI (Base64) to store directly in DB
    // This bypasses R2 "Access Denied" issues
    const base64Image = qrBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64Image}`;

    // Save to DB
    await db.insert(qrCodes).values({
      orgId: validatedData.orgId,
      targetUrl: validatedData.targetUrl,
      slug: slug,
      imageUrl: dataUri,
      scanCount: 0,
    });

    // revalidatePath("/ceo/qr-code"); // Removing to prevent hangs
    console.log("QR Code generated successfully for:", slug);
    return { success: true };
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    // @ts-expect-error - error is unknown
    return { success: false, error: error.message || "Failed to generate QR code" };
  }
}

export async function deleteQRCode(id: number) {
  try {
    await db.delete(qrCodes).where(eq(qrCodes.id, id));
    return { success: true };
  } catch (error) {
    console.error("Failed to delete QR code:", error);
    return { success: false, error: "Failed to delete QR code" };
  }
}

export async function getQRCodes(orgId: string) {
    if (!orgId) return [];
    return await db.query.qrCodes.findMany({
        where: eq(qrCodes.orgId, orgId),
        orderBy: (qrCodes, { desc }) => [desc(qrCodes.createdAt)],
    });
}
