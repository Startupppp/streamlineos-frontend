import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { uploadFile, isStorageConfigured } from "../../../../lib/storage";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function uploadFileLocally(file: File, folder: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
  const fileName = `${Date.now()}-${sanitizedName}`;
  
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
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
    const folder = (formData.get("folder") as string) || "uploads";

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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
