"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { generateQRCodeWithLogo } from "@/lib/qr-code";
import { uploadFile, deleteFile, getFileKeyFromUrl } from "@/lib/storage";
import { join } from "path";
import { existsSync } from "fs";

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
    let existing = await db.query.qrCodes.findFirst({
      where: eq(qrCodes.slug, slug),
    });

    // Retry for collision (max 5 attempts)
    let attempts = 0;
    while (existing && attempts < 5) {
      slug = nanoid(8);
      existing = await db.query.qrCodes.findFirst({
        where: eq(qrCodes.slug, slug),
      });
      attempts++;
    }

    if (existing) {
      return { success: false, error: "Failed to generate unique slug" };
    }

    // Get redirect base URL from environment variable
    const redirectBaseUrl =
      process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      "";

    if (!redirectBaseUrl) {
      return {
        success: false,
        error: "NEXT_PUBLIC_QR_REDIRECT_BASE_URL or NEXTAUTH_URL must be set",
      };
    }

    // Build tracking URL
    const trackingUrl = `${redirectBaseUrl}/qr/${slug}`;

    // Get logo path
    const logoPath = join(process.cwd(), "public", "logo.svg");
    const logoExists = existsSync(logoPath);

    // Generate QR Code with logo
    const qrBuffer = await generateQRCodeWithLogo({
      url: trackingUrl,
      logoPath: logoExists ? logoPath : undefined,
      qrSize: 1000,
      errorCorrectionLevel: "H",
      margin: 2,
    });

    // Upload to R2 bucket
    const uploadResult = await uploadFile(
      qrBuffer,
      "qr-codes",
      `${slug}.png`,
      "image/png"
    );

    // Save to DB with R2 URL
    await db.insert(qrCodes).values({
      orgId: validatedData.orgId,
      targetUrl: validatedData.targetUrl,
      slug: slug,
      imageUrl: uploadResult.url,
      scanCount: 0,
    });

    console.log("QR Code generated successfully for:", slug);
    return { success: true };
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate QR code";
    return { success: false, error: errorMessage };
  }
}

export async function deleteQRCode(id: number) {
  try {
    // Get QR code to retrieve image URL before deletion
    const qrCode = await db.query.qrCodes.findFirst({
      where: eq(qrCodes.id, id),
    });

    if (!qrCode) {
      return { success: false, error: "QR code not found" };
    }

    // Delete from R2 if imageUrl is an R2 URL
    if (qrCode.imageUrl && !qrCode.imageUrl.startsWith("data:")) {
      try {
        const fileKey = getFileKeyFromUrl(qrCode.imageUrl);
        await deleteFile(fileKey);
      } catch (r2Error) {
        console.warn("Failed to delete QR code from R2:", r2Error);
        // Continue with DB deletion even if R2 deletion fails
      }
    }

    // Delete from database
    await db.delete(qrCodes).where(eq(qrCodes.id, id));
    return { success: true };
  } catch (error) {
    console.error("Failed to delete QR code:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete QR code";
    return { success: false, error: errorMessage };
  }
}

export async function getQRCodes(orgId: string) {
    if (!orgId) return [];
    return await db.query.qrCodes.findMany({
        where: eq(qrCodes.orgId, orgId),
        orderBy: (qrCodes, { desc }) => [desc(qrCodes.createdAt)],
    });
}
