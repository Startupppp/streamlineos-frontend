import { type NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api/backend-proxy";
import { makeBackendToken } from "@/lib/api/make-backend-token";
import { withAuth } from "@/lib/api/helpers";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const auth = await makeBackendToken(session);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return proxyToBackend(req, "/chat/ably-token", { method: "GET", auth });
  });
}
