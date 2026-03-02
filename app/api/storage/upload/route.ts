import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { uploadFile, isStorageConfigured } from "../../../../lib/storage";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

async function uploadFileLocally(file: File, folder: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
  const fileName = `${Date.now()}-${sanitizedName}`;

  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  const uploadDir = path.resolve(uploadsRoot, folder);

  if (!uploadDir.startsWith(uploadsRoot + path.sep) && uploadDir !== uploadsRoot) {
    throw new Error("Invalid upload folder");
  }

  await mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  const url = `/uploads/${folder}/${fileName}`;

  return {
    url,
    key: `${folder}/${fileName}`,
    size: buffer.length,
    mimeType: file.type,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const rawFolder = (formData.get("folder") as string) || "uploads";
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "-");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

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

    let result;
    if (isStorageConfigured()) {
      try {
        result = await uploadFile(file, folder);
      } catch (r2Error) {
        result = await uploadFileLocally(file, folder);
      }
    } else {
      result = await uploadFileLocally(file, folder);
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
