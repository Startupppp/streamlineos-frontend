import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import {
  getFileStream,
  isStorageConfigured,
} from "../../../../lib/storage";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "image/jpeg";
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
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return new NextResponse("Missing key parameter", { status: 400 });
    }
    if (isStorageConfigured()) {
      try {
        const { body, contentType } = await getFileStream(key);
        const webStream = Readable.toWeb(body) as ReadableStream;
        return new NextResponse(webStream, {
          headers: {
            "Content-Type": contentType ?? "image/jpeg",
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      } catch (err) {
        logger.warn("R2 image fetch failed, falling back to local", { key, error: err });
      }
    }
    const localPath = resolveLocalPath(key);
    if (localPath) {
      const buffer = await readFile(localPath);
      const mimeType = getMimeType(localPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    return new NextResponse("Not found", { status: 404 });
  } catch {
    return new NextResponse("Internal error", { status: 500 });
  }
}
