import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { uploadFile, isStorageConfigured } from "../../../../lib/storage";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Local storage fallback when R2 is not configured
async function uploadFileLocally(file: File, folder: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
  const fileName = `${Date.now()}-${sanitizedName}`;
  
  // Create the uploads directory in public folder
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, buffer);
  
  // Return the public URL
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

    // Use R2 if configured, otherwise fall back to local storage
    let result;
    if (isStorageConfigured()) {
      try {
        result = await uploadFile(file, folder);
      } catch (r2Error) {
        // R2 failed (wrong credentials, access denied, etc.) - fall back to local storage
        console.warn("[Storage] R2 upload failed, falling back to local storage:", 
          r2Error instanceof Error ? r2Error.message : "Unknown error"
        );
        result = await uploadFileLocally(file, folder);
        console.log("[Storage] Using local fallback storage:", result.url);
      }
    } else {
      // Fallback to local file storage
      result = await uploadFileLocally(file, folder);
      console.log("[Storage] Using local fallback storage:", result.url);
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log error for debugging in development
    if (process.env.NODE_ENV === "development") {
      console.error("Upload error:", errorMessage, errorStack);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
