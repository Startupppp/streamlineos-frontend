import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQRCodeImageUrl } from "@/app/(dashboard)/ceo/qr-code/actions";
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    if (format === "svg") {
      const trackingUrl = process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL}/qr/${slug}`
        : process.env.NEXTAUTH_URL 
          ? `${process.env.NEXTAUTH_URL}/qr/${slug}`
          : `https://localhost:3000/qr/${slug}`;
      
      const { default: QRCode } = await import("qrcode");
      const svgString = await QRCode.toString(trackingUrl, { 
        type: "svg", 
        width: 1024, 
        margin: 2 
      });

      return new NextResponse(svgString, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="qr-code-${slug}.svg"`,
        },
      });
    }

    let imageUrl = qrCode.imageUrl;
    
    if (!imageUrl || !imageUrl.trim()) {
      return NextResponse.json({ error: "Image URL not found" }, { status: 404 });
    }

    try {
      const finalUrl = await getQRCodeImageUrl(imageUrl.trim());
      
      if (!finalUrl || (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://") && !finalUrl.startsWith("/"))) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 500 });
      }

      let fetchUrl = finalUrl;
      if (finalUrl.startsWith("/")) {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        fetchUrl = `${baseUrl}${finalUrl}`;
      }

      try {
        const urlObj = new URL(fetchUrl);
        const blockedHosts = ["169.254.169.254", "metadata.google.internal", "localhost", "127.0.0.1", "0.0.0.0"];
        if (blockedHosts.includes(urlObj.hostname) || urlObj.hostname.startsWith("10.") || urlObj.hostname.startsWith("192.168.") || urlObj.hostname.startsWith("172.")) {
          return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(fetchUrl, {
        method: "GET",
        headers: { "User-Agent": "QR-Code-Downloader/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }

      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/png";

      let finalBuffer: Buffer;
      let finalContentType: string;
      let filename: string;

      if (format === "jpeg" && contentType.includes("png")) {
        const sharp = await import("sharp");
        const imageData = Buffer.from(imageBuffer);
        finalBuffer = await sharp.default(imageData)
          .jpeg({ quality: 90 })
          .toBuffer();
        finalContentType = "image/jpeg";
        filename = `qr-code-${slug}.jpg`;
      } else if (format === "jpeg") {
        finalBuffer = Buffer.from(imageBuffer);
        finalContentType = "image/jpeg";
        filename = `qr-code-${slug}.jpg`;
      } else {
        finalBuffer = Buffer.from(imageBuffer);
        finalContentType = contentType;
        filename = `qr-code-${slug}.png`;
      }

      return new NextResponse(new Uint8Array(finalBuffer), {
        headers: {
          "Content-Type": finalContentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache",
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to download QR code: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Download failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

