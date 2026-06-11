import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/helpers";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import { logger } from "@/lib/logger";

const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/vnd.ms-excel": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return true;
  if (buffer.length < 12) return false;
  const matchesSignature = signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
  if (!matchesSignature) return false;

  if (mimeType === "image/webp") {
    return buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  }
  return true;
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
    if (!isStorageConfigured()) {
      return NextResponse.json(
        { error: "File storage is not available" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const folderEntry = formData.get("folder");
    const rawFolder = typeof folderEntry === "string" && folderEntry.length > 0 ? folderEntry : "uploads";
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "-");

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match declared type" },
        { status: 400 }
      );
    }

    const result = await uploadFile(file, folder);

    const { createAuditLog } = await import("@/lib/audit-log");
    createAuditLog({
      action: "file.upload",
      userId: session.user.id,
      metadata: { fileKey: result.key, fileSize: result.size, mimeType: result.mimeType },
    }).catch((err) => {
      logger.error("Failed to create audit log for file upload", { error: err instanceof Error ? err.message : "Unknown" });
    });

    return NextResponse.json(result);
    } catch (error) {
      logger.error("File upload failed", error);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
  });
}
