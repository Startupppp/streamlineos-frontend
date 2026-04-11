import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit-log";
import {
  getFileUrl,
  getFileKeyFromUrl,
  getFileStream,
  getFileNameFromKey,
  isStorageConfigured,
} from "@/lib/storage";
import { db } from "@/lib/db";
import { organizationMembers, documents } from "@/lib/db/schema";
import { eq, ilike } from "drizzle-orm";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

function isValidFileKey(fileKey: string): boolean {
  if (fileKey.includes("..") || fileKey.includes("\\") || fileKey.startsWith("/")) return false;
  if (fileKey.includes("\0")) return false;
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isStorageConfigured()) {
      return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
    }

    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get("url");
    const key = searchParams.get("key");
    const rawExpires = parseInt(searchParams.get("expiresIn") || "3600", 10);
    const expiresIn = isNaN(rawExpires) ? 3600 : Math.min(Math.max(rawExpires, 60), 86400);
    const attachment = searchParams.get("attachment") === "1";

    if (!url && !key) {
      return NextResponse.json({ error: "URL or key required" }, { status: 400 });
    }

    const fileKey = key || (url ? getFileKeyFromUrl(url) : "");
    if (!fileKey || !isValidFileKey(fileKey)) {
      return NextResponse.json({ error: "Invalid file reference" }, { status: 400 });
    }

    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fileRecord = await db.query.documents.findFirst({
      where: ilike(documents.fileUrl, `%${fileKey}%`),
    });
    if (fileRecord && fileRecord.orgId !== member.orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    createAuditLog({
      action: "file.download",
      userId: session.user.id,
      orgId: member.orgId,
      metadata: { fileKey },
    }).catch((err) => {
      logger.error("Failed to create audit log for file download", { error: err instanceof Error ? err.message : "Unknown" });
    });

    if (attachment) {
      const { body, contentType } = await getFileStream(fileKey);
      const filename = getFileNameFromKey(fileKey);
      const webStream = Readable.toWeb(body) as ReadableStream;
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": contentType ?? getMimeType(fileKey),
          "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "%22")}"`,
        },
      });
    }

    const signedUrl = await getFileUrl(fileKey, expiresIn);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    logger.error("Download error", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
