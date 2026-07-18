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

function unwrapBackend<T>(body: unknown): T {
  if (body !== null && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (record.success === true && "data" in record) {
      return record.data as T;
    }
  }
  return body as T;
}

async function fetchLiveOrgData(userId: string): Promise<LiveOrgData | null> {
  if (!INTERNAL_SECRET) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/auth/session-data/${userId}`, {
      headers: { "x-internal-secret": INTERNAL_SECRET },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = unwrapBackend<{
      orgId?: string | null;
      isOrgOwner?: boolean;
    }>(await res.json());
    return {
      orgId: data.orgId ?? null,
      isOrgOwner: data.isOrgOwner === true,
    };
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
