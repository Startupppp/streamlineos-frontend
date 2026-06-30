import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

interface LiveSessionData {
  orgId: string | null;
  isOrgOwner: boolean;
}

async function fetchLiveOrgData(userId: string): Promise<LiveSessionData | null> {
  if (!INTERNAL_SECRET) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/auth/session-data/${userId}`, {
      headers: { "x-internal-secret": INTERNAL_SECRET },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json() as { orgId?: string | null; isOrgOwner?: boolean };
    return { orgId: data.orgId ?? null, isOrgOwner: data.isOrgOwner ?? false };
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Backend token not configured" }, { status: 503 });
  }

  let orgId = session.orgId ?? null;
  let isOrgOwner = session.user.isOrgOwner === true;

  if (!orgId) {
    const live = await fetchLiveOrgData(session.user.id);
    if (live) {
      orgId = live.orgId;
      isOrgOwner = live.isOrgOwner;
    }
  }

  const branchId = session.branchId ?? null;
  const token = await new SignJWT({
    orgId,
    branchId,
    role: session.user.role,
    permissions: session.permissions ?? [],
    enabledModules: session.enabledModules ?? [],
    plan: session.plan ?? null,
    isPlatformAdmin: session.user.isPlatformAdmin === true,
    isOrgOwner,
    sessionId: session.sessionId ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json({ token, expiresIn: 600 });
}
