import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import {
  getFileUrl,
  getFileKeyFromUrl,
  getFileStream,
  getFileNameFromKey,
  isStorageConfigured,
} from "../../../../lib/storage";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
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

function resolveLocalPath(fileKey: string): string | null {
  const publicDir = path.resolve(process.cwd(), "public");
  const candidates = [
    path.resolve(process.cwd(), "public", "uploads", fileKey),
    path.resolve(process.cwd(), "public", fileKey),
  ];
  for (const resolved of candidates) {
    if (!resolved.startsWith(publicDir + path.sep)) continue;
    if (existsSync(resolved)) return resolved;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get("url");
    const key = searchParams.get("key");
    const rawExpires = parseInt(searchParams.get("expiresIn") || "3600", 10);
    const expiresIn = isNaN(rawExpires) ? 3600 : Math.min(Math.max(rawExpires, 60), 86400);
    const attachment = searchParams.get("attachment") === "1";

    if (!url && !key) {
      return NextResponse.json(
        { error: "URL or key required" },
        { status: 400 }
      );
    }

    const fileKey = key || (url ? getFileKeyFromUrl(url) : "");

    if (!fileKey) {
      return NextResponse.json(
        { error: "Invalid file reference" },
        { status: 400 }
      );
    }
    if (isStorageConfigured()) {
      try {
        if (attachment) {
          const { body, contentType } = await getFileStream(fileKey);
          const filename = getFileNameFromKey(fileKey);
          const webStream = Readable.toWeb(body) as ReadableStream;
          return new NextResponse(webStream, {
            headers: {
              "Content-Type": contentType ?? "application/octet-stream",
              "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "%22")}"`,
            },
          });
        }
        const signedUrl = await getFileUrl(fileKey, expiresIn);
        return NextResponse.json({ url: signedUrl });
      } catch (err) {
        logger.warn("R2 download failed, falling back to local", { fileKey, error: err });
      }
    }
    const localPath = resolveLocalPath(fileKey);
    if (localPath) {
      if (attachment) {
        const buffer = await readFile(localPath);
        const filename = getFileNameFromKey(fileKey);
        const mimeType = getMimeType(localPath);
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "%22")}"`,
          },
        });
      }
      const localUrl = `/uploads/${fileKey}`;
      return NextResponse.json({ url: localUrl });
    }

    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
