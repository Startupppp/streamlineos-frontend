import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import { getFileStream, isStorageConfigured } from "../../../../lib/storage";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return new NextResponse("Missing key parameter", { status: 400 });
    }

    if (!isStorageConfigured()) {
      return new NextResponse("Cloud storage not configured", { status: 503 });
    }

    const { body, contentType } = await getFileStream(key);
    const webStream = Readable.toWeb(body) as ReadableStream;
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType ?? getMimeType(key),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    logger.error("Image proxy error", error);
    return new NextResponse("Not found", { status: 404 });
  }
}
