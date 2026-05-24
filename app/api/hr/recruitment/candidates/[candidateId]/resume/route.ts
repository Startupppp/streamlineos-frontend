import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getFileStream,
  getFileKeyFromUrl,
  getFileNameFromKey,
  isStorageConfigured,
} from "@/lib/storage";
import { logger } from "@/lib/logger";

const MIME_FALLBACK: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function mimeFromName(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return MIME_FALLBACK[ext] ?? "application/octet-stream";
}

function isSafeKey(key: string): boolean {
  if (!key) return false;
  if (key.includes("..") || key.includes("\\") || key.startsWith("/")) return false;
  if (key.includes("\0")) return false;
  return true;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = (session as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization context" }, { status: 403 });
    }

    if (!isStorageConfigured()) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    const { candidateId: rawId } = await params;
    const candidateId = Number(rawId);
    if (!Number.isFinite(candidateId)) {
      return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
    }

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)),
      columns: { id: true, resumeUrl: true, firstName: true, lastName: true },
    });
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }
    if (!candidate.resumeUrl) {
      return NextResponse.json({ error: "No resume on file" }, { status: 404 });
    }

    const key = getFileKeyFromUrl(candidate.resumeUrl);
    if (!isSafeKey(key)) {
      return NextResponse.json({ error: "Invalid resume reference" }, { status: 400 });
    }

    const { body, contentType, contentLength } = await getFileStream(key);
    const originalName = getFileNameFromKey(key);
    const safeName = originalName.replace(/"/g, "");
    const downloadName = `${candidate.firstName}-${candidate.lastName}-resume.${originalName.split(".").pop() ?? "pdf"}`
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "")
      .toLowerCase();

    const wantsDownload = req.nextUrl.searchParams.get("download") === "1";
    const disposition = wantsDownload
      ? `attachment; filename="${downloadName}"`
      : `inline; filename="${safeName}"`;

    const webStream = Readable.toWeb(body) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": contentType ?? mimeFromName(originalName),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=0, no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (contentLength) headers["Content-Length"] = String(contentLength);

    return new NextResponse(webStream, { headers });
  } catch (error) {
    logger.error("Resume stream failed", error);
    return NextResponse.json({ error: "Failed to load resume" }, { status: 500 });
  }
}
