import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFileUrl, getFileKeyFromUrl } from "../../../../lib/storage";

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get("url");
    const key = searchParams.get("key");
    const expiresIn = parseInt(searchParams.get("expiresIn") || "3600");

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

    const signedUrl = await getFileUrl(fileKey, expiresIn);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
