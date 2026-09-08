import { cache } from "react";
import { randomUUID } from "crypto";
import { decodeJwt, SignJWT } from "jose";
import type { Plan } from "@/lib/billing/feature-gates";
import { BACKEND_URL } from "@/lib/backend-url";
import { withCorrelation } from "@/lib/observability/with-correlation";
import { isRecord } from "@/lib/is-record";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

export function resolveSessionDisplayName(data: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const displayName = data.name?.trim();
  if (displayName) return displayName;
  const full = `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim();
  if (full) return full;
  const email = data.email?.trim();
  if (!email) return "";
  const local = email.split("@")[0]?.trim();
  return local || email;
}

interface BackendJwtEntry {
  token: string;
  expiresAt: number;
}
const backendJwtStore = new Map<string, BackendJwtEntry>();

export function getBackendJwtFromStore(key: string): string | null {
  const entry = backendJwtStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    backendJwtStore.delete(key);
    return null;
  }
  return entry.token;
}

export function setBackendJwtInStore(key: string, token: string): void {
  try {
    const claims = decodeJwt(token);
    const exp = typeof claims.exp === "number" ? claims.exp : 0;
    const expiresAt = exp * 1000 - 60_000;
    if (expiresAt > Date.now()) {
      backendJwtStore.set(key, { token, expiresAt });
    }
  } catch {
  }
}

export async function exchangeSessionForBackendJwt(
  userId: string,
  sessionId: string,
  orgId: string | null,
): Promise<string | null> {
  const internalSecret = process.env.INTERNAL_API_SECRET ?? "";
  if (!internalSecret) return null;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? "";
  if (!nextAuthSecret) return null;

  const nonce = randomUUID();
  let proof: string;
  try {
    proof = await new SignJWT({ sessionId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuer("streamlineos-web-session-proof")
      .setAudience("streamlineos-api-exchange")
      .setJti(nonce)
      .setIssuedAt()
      .setExpirationTime("30s")
      .sign(new TextEncoder().encode(nextAuthSecret));
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${BACKEND_URL}/auth/session-exchange`, {
      method: "POST",
      headers: withCorrelation(
        new Headers({
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
          "x-session-proof": proof,
        }),
      ),
      body: JSON.stringify({ orgId: orgId ?? null }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const data = unwrapBackend<{ token?: string }>(body);
    return typeof data?.token === "string" && data.token.length > 0 ? data.token : null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export interface SessionData {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  image: string | null;
  role: string | null;
  isActive: boolean;
  branchId: number | null;
  orgId: string | null;
  isOrgOwner: boolean;
  enabledModules: string[];
  plan: Plan | null;
  orgOnboardingCompletedAt: string | null;
  userOnboardingCompletedAt: string | null;
  organizationAccess: "active" | "suspended" | "none";
  suspendedOrganizationName: string | null;
}

export async function fetchSessionData(userId: string): Promise<SessionData | null> {
  const attempts = 2;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/session-data/${userId}`, {
        headers: withCorrelation(new Headers({ "x-internal-secret": INTERNAL_SECRET })),
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const body: unknown = await res.json();
      return unwrapBackend<SessionData>(body);
    } catch {
      clearTimeout(timeout);
    }
  }
  return null;
}

async function fetchSessionDataWithCache(
  userId: string,
  _orgId: string | null,
): Promise<SessionData | null> {
  return fetchSessionData(userId);
}

export const fetchSessionDataCached = cache(fetchSessionDataWithCache);

export function unwrapBackend<T>(body: unknown): T {
  if (isRecord(body) && body.success === true && "data" in body) return body.data as T;
  return body as T;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export interface GoogleAuthResult {
  userId: string;
  sessionId: string | null;
}

export async function resolveGoogleUser(
  email: string,
  googleId: string,
  clientUserAgent: string | null,
  clientIp: string | null,
  name?: string | null,
  image?: string | null,
): Promise<GoogleAuthResult | null> {
  try {
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    };
    if (clientUserAgent) reqHeaders["x-client-user-agent"] = clientUserAgent;
    if (clientIp) reqHeaders["x-client-ip"] = clientIp;

    const res = await fetch(`${BACKEND_URL}/auth/google`, {
      method: "POST",
      headers: withCorrelation(new Headers(reqHeaders)),
      body: JSON.stringify({
        email,
        googleId,
        name: name ?? undefined,
        image: image ?? undefined,
      }),
    });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    if (!isRecord(raw)) return null;
    const envelope = isRecord(raw.data) ? raw.data : undefined;
    const userId = readString(envelope?.userId) ?? readString(raw.userId);
    if (!userId) return null;
    const sessionId = readString(envelope?.sessionId) ?? readString(raw.sessionId) ?? null;
    return { userId, sessionId };
  } catch {
    return null;
  }
}

export function buildUserFromSessionData(
  userId: string,
  sessionData: SessionData,
  extra?: { daysUntilExpiry?: number },
) {
  return {
    id: userId,
    email: sessionData.email,
    name: resolveSessionDisplayName(sessionData),
    image: sessionData.image,
    role: sessionData.role ?? undefined,
    isActive: sessionData.isActive,
    orgId: sessionData.orgId ?? null,
    isOrgOwner: sessionData.isOrgOwner,
    branchId: sessionData.branchId ?? null,
    plan: sessionData.plan ?? null,
    enabledModules: sessionData.enabledModules,
    orgOnboardingCompletedAt: sessionData.orgOnboardingCompletedAt,
    userOnboardingCompletedAt: sessionData.userOnboardingCompletedAt,
    organizationAccess: sessionData.organizationAccess,
    suspendedOrganizationName: sessionData.suspendedOrganizationName,
    ...(extra?.daysUntilExpiry !== undefined
      ? { daysUntilExpiry: extra.daysUntilExpiry }
      : {}),
  };
}
