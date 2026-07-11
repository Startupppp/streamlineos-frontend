import { SignJWT } from "jose";
import type { Session } from "next-auth";

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

interface LiveOrgData {
  orgId: string | null;
  isOrgOwner: boolean;
}

async function fetchLiveOrgData(userId: string): Promise<LiveOrgData | null> {
  if (!INTERNAL_SECRET) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/auth/session-data/${userId}`, {
      headers: { "x-internal-secret": INTERNAL_SECRET },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { orgId?: string | null; isOrgOwner?: boolean };
    return { orgId: data.orgId ?? null, isOrgOwner: data.isOrgOwner ?? false };
  } catch {
    return null;
  }
}

export async function mintBackendJwt(session: Session): Promise<string | null> {
  if (!session.user?.id) return null;
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) return null;

  const sessionId = session.sessionId?.trim();
  if (!sessionId) return null;

  // Prefer live DB membership over the NextAuth cookie — the cookie can lag or
  // hold a stale orgId after a failed/partial setup attempt.
  const live = await fetchLiveOrgData(session.user.id);
  const orgId = live ? live.orgId : (session.orgId ?? null);
  const isOrgOwner = live ? live.isOrgOwner : session.user.isOrgOwner === true;

  return new SignJWT({
    orgId,
    branchId: session.branchId ?? null,
    role: session.user.role ?? "",
    enabledModules: session.enabledModules ?? [],
    plan: session.plan ?? null,
    isPlatformAdmin: session.user.isPlatformAdmin === true,
    isOrgOwner,
    sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
}
