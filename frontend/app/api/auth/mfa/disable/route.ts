import { NextResponse, type NextRequest } from "next/server";
import { auth, invalidateUserSession } from "@/lib/auth";
import { proxyToBackend } from "@/lib/api/backend-proxy";
import { makeBackendToken } from "@/lib/api/make-backend-token";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await makeBackendToken(session);
  if (!token) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  const response = await proxyToBackend(req, "/auth/mfa/disable", { method: "POST", auth: token });
  if (response.ok) {
    await invalidateUserSession(session.user.id);
  }
  return response;
}
