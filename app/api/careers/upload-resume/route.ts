import { NextRequest, NextResponse } from "next/server";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import { logger } from "@/lib/logger";

const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

const FILE_SIGNATURES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;
  if (buffer.length < 4) return false;
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(req: NextRequest) {
  try {
    if (!isStorageConfigured()) {
      return NextResponse.json(
        { error: "File storage is not available." },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Resume is too large. Maximum size is 10 MB." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json(
        { error: "Only PDF, DOC, or DOCX files are allowed." },
        { status: 400 },
      );
    }

    if (!hasAllowedExtension(file.name)) {
      return NextResponse.json(
        { error: "Filename must end in .pdf, .doc, or .docx." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match its declared type." },
        { status: 400 },
      );
    }

    const result = await uploadFile(file, "resumes");

    return NextResponse.json({ url: result.url, key: result.key });
  } catch (error) {
    logger.error("Public resume upload failed", error);
    return NextResponse.json(
      { error: "Failed to upload resume. Please try again." },
      { status: 500 },
    );
  }
}
