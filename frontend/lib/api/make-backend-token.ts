import { SignJWT } from "jose";
import type { Session } from "next-auth";

export async function makeBackendToken(session: Session): Promise<string | null> {
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
