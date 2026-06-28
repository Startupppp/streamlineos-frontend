import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { proxyToBackend } from "@/lib/api/backend-proxy";
import { makeBackendToken } from "@/lib/api/make-backend-token";

async function handler(req: NextRequest, method: string, backendPath: string) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await makeBackendToken(session);
  if (!token) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  return proxyToBackend(req, backendPath, { method, auth: token });
}

export function GET(req: NextRequest) {
  return handler(req, "GET", "/api/auth/sessions");
}

export function DELETE(req: NextRequest) {
  return handler(req, "DELETE", "/api/auth/sessions");
}
