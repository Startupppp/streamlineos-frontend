import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/helpers";
import { logger } from "@/lib/logger";
import { getFileStream, isStorageConfigured } from "@/lib/storage";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

function isValidFileKey(key: string): boolean {
  if (key.includes("..") || key.includes("\\") || key.startsWith("/")) return false;
  if (key.includes("\0")) return false;
  return true;
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
    const key = req.nextUrl.searchParams.get("key");
    if (!key || !isValidFileKey(key)) {
      return NextResponse.json({ error: "Invalid key parameter" }, { status: 400 });
    }

    if (!isStorageConfigured()) {
      return NextResponse.json({ error: "Storage not available" }, { status: 503 });
    }

    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      logger.error("Image proxy error", { error: error instanceof Error ? error.message : "Unknown" });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  });
}
