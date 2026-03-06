import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQRCodeImageUrl } from "@/app/(dashboard)/ceo/qr-code/actions";
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

const ALLOWED_DOMAINS = [
  "r2.cloudflarestorage.com",
  "crm.vaivammcapital.com",
  "api.dicebear.com",
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") return false;

    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname === "::1" ||
      hostname === "metadata.google.internal" ||
      hostname === "169.254.169.254"
    ) {
      return false;
    }

    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80")
    ) {
      return false;
    }

    const isAllowed = ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    return isAllowed;
  } catch {
    return false;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const slug = searchParams.get("slug");
    const format = searchParams.get("format") || "png";

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    if (!["png", "jpeg", "svg"].includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const qrCode = await db.query.qrCodes.findFirst({
      where: eq(qrCodes.slug, slug),
    });

    if (!qrCode) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    const safeSlug = sanitizeFilename(slug);

    if (format === "svg") {
      const trackingUrl = process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL
        ? `${process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL}/qr/${slug}`
        : process.env.NEXTAUTH_URL
          ? `${process.env.NEXTAUTH_URL}/qr/${slug}`
          : `http://localhost:3000/qr/${slug}`;

      const { default: QRCode } = await import("qrcode");
      const svgString = await QRCode.toString(trackingUrl, {
        type: "svg",
        width: 1024,
        margin: 2,
      });

      return new NextResponse(svgString, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="${safeSlug}.svg"`,
        },
      });
    }

    const imageUrl = qrCode.imageUrl;

    if (!imageUrl || !imageUrl.trim()) {
      return NextResponse.json({ error: "Image URL not found" }, { status: 404 });
    }

    try {
      const finalUrl = await getQRCodeImageUrl(imageUrl.trim());

      if (
        !finalUrl ||
        (!finalUrl.startsWith("http://") &&
          !finalUrl.startsWith("https://") &&
          !finalUrl.startsWith("/"))
      ) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 500 });
      }

      let fetchUrl = finalUrl;
      if (finalUrl.startsWith("/")) {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        fetchUrl = `${baseUrl}${finalUrl}`;
      }

      if (!isAllowedUrl(fetchUrl)) {
        logger.warn("Blocked SSRF attempt on QR download", { url: fetchUrl });
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(fetchUrl, {
        method: "GET",
        headers: { "User-Agent": "QR-Code-Downloader/1.0" },
        signal: controller.signal,
        redirect: "error",
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
        return NextResponse.json({ error: "Image too large" }, { status: 400 });
      }

      const imageBuffer = await response.arrayBuffer();

      if (imageBuffer.byteLength > MAX_RESPONSE_SIZE) {
        return NextResponse.json({ error: "Image too large" }, { status: 400 });
      }

      const contentType = response.headers.get("content-type") || "image/png";

      let finalBuffer: Buffer;
      let finalContentType: string;
      let filename: string;

      if (format === "jpeg" && contentType.includes("png")) {
        const sharp = await import("sharp");
        const imageData = Buffer.from(imageBuffer);
        finalBuffer = await sharp.default(imageData).jpeg({ quality: 90 }).toBuffer();
        finalContentType = "image/jpeg";
        filename = `${safeSlug}.jpg`;
      } else if (format === "jpeg") {
        finalBuffer = Buffer.from(imageBuffer);
        finalContentType = "image/jpeg";
        filename = `${safeSlug}.jpg`;
      } else {
        finalBuffer = Buffer.from(imageBuffer);
        finalContentType = contentType;
        filename = `${safeSlug}.png`;
      }

      return new NextResponse(new Uint8Array(finalBuffer), {
        headers: {
          "Content-Type": finalContentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache",
        },
      });
    } catch (error) {
      logger.error("QR code download failed", error);
      return NextResponse.json(
        { error: "Failed to download QR code" },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("QR download route error", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
