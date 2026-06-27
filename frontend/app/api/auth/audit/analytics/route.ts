import { NextResponse, type NextRequest } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/lib/auth";
import { proxyToBackend } from "@/lib/api/backend-proxy";
import type { Session } from "next-auth";

async function makeBackendToken(session: Session): Promise<string | null> {
  if (!session.user?.id || !session.orgId) return null;
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) return null;
  return new SignJWT({
    orgId: session.orgId,
    branchId: session.branchId ?? null,
    role: session.user.role,
    permissions: session.permissions ?? [],
    enabledModules: session.enabledModules ?? [],
    plan: session.plan ?? null,
    isPlatformAdmin: session.user.isPlatformAdmin === true,
    isOrgOwner: session.user.isOrgOwner === true,
    sessionId: session.sessionId ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await makeBackendToken(session);
  if (!token) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  return proxyToBackend(req, "/api/auth/audit/analytics", { method: "GET", auth: token });
}
