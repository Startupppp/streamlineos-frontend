import { cache } from "react";
import { randomUUID } from "crypto";
import { decodeJwt, SignJWT } from "jose";
import {
  googleOAuthResponseSchema,
  sessionDataSchema,
  sessionExchangeResponseSchema,
  type SessionData,
} from "@/lib/auth-session-schema";
import { BACKEND_URL } from "@/lib/backend-url";
import { withCorrelation } from "@/lib/observability/with-correlation";
import { isRecord } from "@/lib/is-record";
import { resolveSessionClaims } from "@/lib/auth-claims";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

const MAX_STORE_SIZE = 5_000;

interface BackendJwtEntry {
  token: string;
  expiresAt: number;
}
const backendJwtStore = new Map<string, BackendJwtEntry>();

function evictExpiredFromStore(): void {
  const now = Date.now();
  for (const [k, entry] of backendJwtStore) {
    if (entry.expiresAt <= now) backendJwtStore.delete(k);
  }
}

function enforceSizeBound(): void {
  if (backendJwtStore.size < MAX_STORE_SIZE) return;
  evictExpiredFromStore();
  if (backendJwtStore.size < MAX_STORE_SIZE) return;
  const sorted = [...backendJwtStore.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  const toRemove = Math.ceil(sorted.length / 2);
  for (let i = 0; i < toRemove; i += 1) backendJwtStore.delete(sorted[i][0]);
}

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
      enforceSizeBound();
      backendJwtStore.set(key, { token, expiresAt });
    }
  } catch {
  }
}

/**
 * Evicts every cached backend JWT belonging to one device session, across every
 * organization that session minted for. The key is `user:session:org`, so a
 * single-org delete would strand the entries an org switch left behind — and
 * logout ends the whole device session, not one of its tenants. User and session
 * ids are UUIDs, so the `:` prefix cannot straddle a neighbouring key.
 *
 * This is a mint cache, never the revocation authority: the backend re-checks the
 * tombstone and `user_sessions.is_revoked` on every request, so revoking another
 * device (which the web tier never observes) is answered there, not here.
 */
export function invalidateBackendJwtSession(userId: string, sessionId: string): void {
  const prefix = `${userId}:${sessionId}:`;
  for (const key of backendJwtStore.keys())
    if (key.startsWith(prefix)) backendJwtStore.delete(key);
}

export function clearBackendJwtStoreForTesting(): void {
  backendJwtStore.clear();
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
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const parsed = sessionExchangeResponseSchema.safeParse(unwrapBackend(body));
    return parsed.success ? parsed.data.token : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
      if (!res.ok) continue;
      const body: unknown = await res.json();
      const parsed = sessionDataSchema.safeParse(unwrapBackend(body));
      if (parsed.success) return parsed.data;
    } catch {
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

async function fetchSessionDataWithCache(userId: string): Promise<SessionData | null> {
  return fetchSessionData(userId);
}

export const fetchSessionDataCached = cache(fetchSessionDataWithCache);

/**
 * Strips the `{ success: true, data }` envelope and returns the payload as
 * `unknown`. It deliberately does not take a type parameter: a generic here is a
 * cast on a value that just arrived from the network, and every caller already
 * has a schema to narrow it with.
 */
export function unwrapBackend(body: unknown): unknown {
  if (isRecord(body) && body.success === true && "data" in body) return body.data;
  return body;
}

export interface GoogleAuthResult {
  userId: string;
  sessionId: string;
}

export async function resolveGoogleUser(
  email: string,
  googleId: string,
  clientUserAgent: string | null,
  clientIp: string | null,
  name?: string | null,
  image?: string | null,
): Promise<GoogleAuthResult | null> {
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "x-internal-secret": INTERNAL_SECRET,
  };
  if (clientUserAgent) reqHeaders["x-client-user-agent"] = clientUserAgent;
  if (clientIp) reqHeaders["x-client-ip"] = clientIp;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${BACKEND_URL}/auth/google`, {
      method: "POST",
      headers: withCorrelation(new Headers(reqHeaders)),
      body: JSON.stringify({
        email,
        googleId,
        name: name ?? undefined,
        image: image ?? undefined,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    const parsed = googleOAuthResponseSchema.safeParse(unwrapBackend(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildUserFromSessionData(
  userId: string,
  sessionData: SessionData,
  extra?: { daysUntilExpiry?: number },
) {
  const claims = resolveSessionClaims(sessionData, {});
  return {
    id: userId,
    email: sessionData.email,
    ...claims,
    ...(extra?.daysUntilExpiry !== undefined
      ? { daysUntilExpiry: extra.daysUntilExpiry }
      : {}),
  };
}
