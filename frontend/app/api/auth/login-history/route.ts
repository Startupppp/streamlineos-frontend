import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { proxyToBackend } from "@/lib/api/backend-proxy";
import { makeBackendToken } from "@/lib/api/make-backend-token";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await makeBackendToken(session);
  if (!token) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  const search = req.nextUrl.search;
  return proxyToBackend(req, `/me/login-history${search}`, { method: "GET", auth: token });
}
