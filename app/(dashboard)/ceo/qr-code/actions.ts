"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { qrCodes, users } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { generateQRCodeWithLogo } from "@/lib/qr-code";
import { uploadFile, deleteFile, getFileKeyFromUrl } from "@/lib/storage";
import { join } from "path";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { auth } from "@/lib/auth";

const generateSchema = z.object({
  targetUrl: z.string().url(),
  orgId: z.string(),
});

export async function generateQRCode(formData: FormData) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Access Denied: You must be logged in to generate QR codes." };
    }

    const rawData = {
      targetUrl: formData.get("targetUrl"),
      orgId: formData.get("orgId"),
    };

    const validatedData = generateSchema.parse(rawData);

    // Check if user is OWNER (check session first, then database)
    if (session.user.role !== "OWNER") {
      // Double-check from database in case session is stale
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });
      
      if (!user || user.role !== "OWNER") {
        return { success: false, error: "Access Denied: Only organization owners can generate QR codes." };
      }
    }

    // Verify user has access to this organization
    const userMembership = await db.query.organizationMembers.findFirst({
      where: (members, { eq: eqFn }) => and(
        eqFn(members.userId, session.user.id),
        eqFn(members.orgId, validatedData.orgId)
      ),
    });

    if (!userMembership) {
      return { success: false, error: "Access Denied: You don't have access to this organization." };
    }

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
    // For local development, default to localhost:3000
    const redirectBaseUrl =
      process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");

    if (!redirectBaseUrl) {
      return {
        success: false,
        error: "NEXT_PUBLIC_QR_REDIRECT_BASE_URL or NEXTAUTH_URL must be set for production",
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

    let imageUrl: string;

    // Try to upload to R2, fallback to local storage for development
    try {
      const uploadResult = await uploadFile(
        qrBuffer,
        "qr-codes",
        `${slug}.png`,
        "image/png"
      );
      imageUrl = uploadResult.url;
    } catch (storageError) {
      // If R2 is not configured (local development), save to public folder
      console.warn("R2 upload failed, using local storage:", storageError);
      
      const publicQrDir = join(process.cwd(), "public", "qr-codes");
      if (!existsSync(publicQrDir)) {
        mkdirSync(publicQrDir, { recursive: true });
      }
      
      const localPath = join(publicQrDir, `${slug}.png`);
      writeFileSync(localPath, qrBuffer);
      imageUrl = `/qr-codes/${slug}.png`;
    }

    // Save to DB
    await db.insert(qrCodes).values({
      orgId: validatedData.orgId,
      targetUrl: validatedData.targetUrl,
      slug: slug,
      imageUrl: imageUrl,
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
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Access Denied: You must be logged in to delete QR codes." };
    }

    // Get QR code to retrieve image URL before deletion
    const qrCode = await db.query.qrCodes.findFirst({
      where: eq(qrCodes.id, id),
    });

    if (!qrCode) {
      return { success: false, error: "QR code not found" };
    }

    // Check if user is OWNER (check session first, then database)
    if (session.user.role !== "OWNER") {
      // Double-check from database in case session is stale
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });
      
      if (!user || user.role !== "OWNER") {
        return { success: false, error: "Access Denied: Only organization owners can delete QR codes." };
      }
    }

    // Verify user has access to this organization
    const userMembership = await db.query.organizationMembers.findFirst({
      where: (members, { eq: eqFn }) => and(
        eqFn(members.userId, session.user.id),
        eqFn(members.orgId, qrCode.orgId)
      ),
    });

    if (!userMembership) {
      return { success: false, error: "Access Denied: You don't have access to this QR code." };
    }

    // Delete from R2 if imageUrl is an R2 URL
    if (qrCode.imageUrl && !qrCode.imageUrl.startsWith("data:") && !qrCode.imageUrl.startsWith("/")) {
      try {
        const fileKey = getFileKeyFromUrl(qrCode.imageUrl);
        await deleteFile(fileKey);
      } catch (r2Error) {
        console.warn("Failed to delete QR code from R2:", r2Error);
        // Continue with DB deletion even if R2 deletion fails
      }
    } else if (qrCode.imageUrl?.startsWith("/")) {
      // Delete local file if it's a local path
      try {
        const { unlinkSync } = await import("fs");
        const localPath = join(process.cwd(), "public", qrCode.imageUrl);
        if (existsSync(localPath)) {
          unlinkSync(localPath);
        }
      } catch (localError) {
        console.warn("Failed to delete local QR code file:", localError);
        // Continue with DB deletion
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
    
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return [];
    }

    // Check if user is OWNER (check session first, then database)
    if (session.user.role !== "OWNER") {
      // Double-check from database in case session is stale
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });
      
      if (!user || user.role !== "OWNER") {
        return [];
      }
    }

    // Verify user has access to this organization
    const userMembership = await db.query.organizationMembers.findFirst({
      where: (members, { eq: eqFn }) => and(
        eqFn(members.userId, session.user.id),
        eqFn(members.orgId, orgId)
      ),
    });

    if (!userMembership) {
      return [];
    }

    return await db.query.qrCodes.findMany({
        where: eq(qrCodes.orgId, orgId),
        orderBy: (qrCodes, { desc }) => [desc(qrCodes.createdAt)],
    });
}
