import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import {
  getFileUrl,
  getFileKeyFromUrl,
  getFileStream,
  getFileNameFromKey,
  isStorageConfigured,
} from "../../../../lib/storage";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get("url");
    const key = searchParams.get("key");
    const expiresIn = parseInt(searchParams.get("expiresIn") || "3600");
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

    // Stream file through API to avoid CORS when client downloads (R2 signed URLs often block browser fetch)
    if (attachment && isStorageConfigured()) {
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
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
