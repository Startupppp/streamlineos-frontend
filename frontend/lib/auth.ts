import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import axios from "axios";
import { randomUUID } from "crypto";
import { headers as nextHeaders } from "next/headers";
import { decodeJwt, SignJWT } from "jose";
import type { Plan } from "@/lib/billing/feature-gates";
import { BACKEND_URL } from "@/lib/backend-url";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

function resolveSessionDisplayName(data: {
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

function getBackendJwtFromStore(key: string): string | null {
  const entry = backendJwtStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    backendJwtStore.delete(key);
    return null;
  }
  return entry.token;
}

function setBackendJwtInStore(key: string, token: string): void {
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

async function exchangeSessionForBackendJwt(
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
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
        "x-session-proof": proof,
      },
      body: JSON.stringify({ orgId: orgId ?? null }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const body = (await res.json()) as unknown;
    const data = unwrapBackend<{ token?: string }>(body);
    return typeof data?.token === "string" && data.token.length > 0 ? data.token : null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

interface SessionData {
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

async function fetchSessionData(userId: string): Promise<SessionData | null> {
  const attempts = 2;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/session-data/${userId}`, {
        headers: { "x-internal-secret": INTERNAL_SECRET },
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const body = (await res.json()) as unknown;
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

const fetchSessionDataCached = cache(fetchSessionDataWithCache);


function unwrapBackend<T>(body: unknown): T {
  if (body !== null && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b.success === true && "data" in b) return b.data as T;
  }
  return body as T;
}

interface GoogleAuthResult {
  userId: string;
  sessionId: string | null;
}

async function resolveGoogleUser(
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
      headers: reqHeaders,
      body: JSON.stringify({
        email,
        googleId,
        name: name ?? undefined,
        image: image ?? undefined,
      }),
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as {
      success?: boolean;
      data?: { userId: string; sessionId?: string };
      userId?: string;
      sessionId?: string;
    };
    const userId = raw?.data?.userId ?? raw?.userId ?? null;
    if (!userId) return null;
    const sessionId = raw?.data?.sessionId ?? raw?.sessionId ?? null;
    return { userId, sessionId };
  } catch {
    return null;
  }
}

function buildUserFromSessionData(
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  basePath: "/api/auth",
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        magicToken: { label: "Magic token", type: "text" },
      },
      async authorize(credentials, request) {
        const magicToken = credentials?.magicToken;
        if (typeof magicToken !== "string" || magicToken.length === 0) return null;
        try {
          const ua = request.headers.get("user-agent") ?? null;
          const rawIp =
            request.headers.get("x-forwarded-for") ??
            request.headers.get("x-real-ip") ??
            null;
          const ip = rawIp ? rawIp.split(",")[0].trim() : null;

          const { data: raw } = await axios.post<unknown>(
            `${BACKEND_URL}/auth/magic-link/verify`,
            { token: magicToken },
            {
              headers: {
                ...(ua ? { "x-client-user-agent": ua } : {}),
                ...(ip ? { "x-client-ip": ip } : {}),
              },
            },
          );
          const data = unwrapBackend<{ userId?: string; sessionId?: string }>(raw);
          if (typeof data?.userId !== "string" || data.userId.length === 0) return null;
          const sessionData = await fetchSessionData(data.userId);
          if (!sessionData) return null;
          return {
            ...buildUserFromSessionData(data.userId, sessionData),
            sessionId: data.sessionId ?? undefined,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        let clientUserAgent: string | null = null;
        let clientIp: string | null = null;
        try {
          const h = await nextHeaders();
          clientUserAgent = h.get("user-agent") ?? null;
          const rawIp = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null;
          clientIp = rawIp ? rawIp.split(",")[0].trim() : null;
        } catch {
        }
        const googleResult = await resolveGoogleUser(
          user.email ?? "",
          account.providerAccountId,
          clientUserAgent,
          clientIp,
          user.name,
          user.image,
        );
        if (!googleResult) return false;
        const { userId, sessionId } = googleResult;
        user.id = userId;
        if (sessionId) user.sessionId = sessionId;
        const sessionData = await fetchSessionData(userId);
        if (sessionData) {
          user.name = resolveSessionDisplayName(sessionData) || user.name || user.email || "";
          user.image = sessionData.image ?? user.image;
          user.role = sessionData.role ?? undefined;
          user.isActive = sessionData.isActive;
          user.orgId = sessionData.orgId ?? null;
          user.isOrgOwner = sessionData.isOrgOwner;
          user.branchId = sessionData.branchId ?? null;
          user.plan = sessionData.plan ?? null;
          user.enabledModules = sessionData.enabledModules;
          user.orgOnboardingCompletedAt = sessionData.orgOnboardingCompletedAt;
          user.userOnboardingCompletedAt = sessionData.userOnboardingCompletedAt;
          user.organizationAccess = sessionData.organizationAccess;
          user.suspendedOrganizationName =
            sessionData.suspendedOrganizationName;
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name ?? null;
        token.role = user.role;
        token.isActive = user.isActive ?? true;
        token.orgId = user.orgId ?? null;
        token.isOrgOwner = user.isOrgOwner ?? false;
        token.orgOnboardingCompletedAt = user.orgOnboardingCompletedAt ?? null;
        token.userOnboardingCompletedAt =
          user.userOnboardingCompletedAt ?? null;
        token.organizationAccess = user.organizationAccess ?? "none";
        token.suspendedOrganizationName =
          user.suspendedOrganizationName ?? null;
        token.sessionId = user.sessionId ?? randomUUID();
        if (user.daysUntilExpiry !== undefined)
          token.daysUntilExpiry = user.daysUntilExpiry;
        token.authProvider = account?.provider ?? "credentials";
      }

      if (trigger === "update") {
        const userId = token.id as string | undefined;
        if (userId) {
          const fresh = await fetchSessionData(userId);
          if (fresh) {
            token.name = resolveSessionDisplayName(fresh);
            token.orgId = fresh.orgId;
            token.isOrgOwner = fresh.isOrgOwner;
            token.role = fresh.role ?? undefined;
            token.isActive = fresh.isActive;
            token.orgOnboardingCompletedAt = fresh.orgOnboardingCompletedAt;
            token.userOnboardingCompletedAt = fresh.userOnboardingCompletedAt;
            token.organizationAccess = fresh.organizationAccess;
            token.suspendedOrganizationName =
              fresh.suspendedOrganizationName;
          } else if (
            session &&
            typeof session === "object" &&
            "name" in session &&
            typeof session.name === "string" &&
            session.name.trim()
          ) {
            token.name = session.name.trim();
          }
        }
      }

      if (!token.sessionId) {
        token.sessionId = randomUUID();
      }

      return token;
    },

    async session({ session, token }) {
      try {
        const tokenOrgId = (token.orgId as string | null | undefined) ?? null;
        const fresh = token.id
          ? await fetchSessionDataCached(token.id as string, tokenOrgId)
          : null;

        const orgId = fresh
          ? fresh.orgId
          : ((token.orgId as string | null | undefined) ?? null);
        const isOrgOwner = fresh
          ? fresh.isOrgOwner
          : ((token.isOrgOwner as boolean | undefined) ?? false);
        const enabledModules = fresh?.enabledModules ?? [];
        const plan = fresh?.plan ?? null;
        const role = fresh?.role ?? (token.role as string | undefined) ?? "";
        const branchId = fresh?.branchId ?? null;

        if (session.user) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = fresh
            ? resolveSessionDisplayName(fresh)
            : ((token.name as string | null | undefined) ??
              session.user.name ??
              "");
          session.user.role = role;
          session.user.image =
            fresh?.image ?? (token.picture as string | null | undefined) ?? null;
          session.user.isActive = fresh?.isActive ?? (token.isActive as boolean);
          session.user.isOrgOwner = isOrgOwner;
        }
        session.orgId = orgId;
        session.branchId = branchId;
        session.sessionId = token.sessionId as string | undefined;
        session.plan = plan;
        session.enabledModules = enabledModules;
        if (token.daysUntilExpiry !== undefined)
          session.daysUntilExpiry = token.daysUntilExpiry as number;
        session.authProvider =
          (token.authProvider as string | undefined) ?? "credentials";
        session.orgOnboardingCompletedAt =
          fresh?.orgOnboardingCompletedAt ??
          (token.orgOnboardingCompletedAt as string | null | undefined) ??
          null;
        session.userOnboardingCompletedAt =
          fresh?.userOnboardingCompletedAt ??
          (token.userOnboardingCompletedAt as string | null | undefined) ??
          null;
        session.organizationAccess =
          fresh?.organizationAccess ??
          (token.organizationAccess as
            | "active"
            | "suspended"
            | "none"
            | undefined) ??
          (orgId ? "active" : "none");
        session.suspendedOrganizationName =
          fresh?.suspendedOrganizationName ??
          (token.suspendedOrganizationName as string | null | undefined) ??
          null;

        const sessionId = (token.sessionId as string | undefined)?.trim();
        if (token.id && sessionId) {
          const userId = token.id as string;
          const jwtCacheKey = `${userId}:${orgId ?? ""}`;
          const cachedJwt = getBackendJwtFromStore(jwtCacheKey);
          if (cachedJwt) {
            session.backendJwt = cachedJwt;
          } else {
            const exchanged = await exchangeSessionForBackendJwt(userId, sessionId, orgId);
            if (exchanged) {
              setBackendJwtInStore(jwtCacheKey, exchanged);
              session.backendJwt = exchanged;
            }
          }
        }

        return session;
      } catch {
        if (session.user) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name =
            (token.name as string | null | undefined) ?? session.user.name ?? "";
          session.user.role = (token.role as string | undefined) ?? "";
          session.user.isActive = (token.isActive as boolean | undefined) ?? true;
          session.user.isOrgOwner =
            (token.isOrgOwner as boolean | undefined) === true;
        }
        session.orgId =
          (token.orgId as string | null | undefined) ?? null;
        session.sessionId = token.sessionId as string | undefined;
        session.orgOnboardingCompletedAt =
          (token.orgOnboardingCompletedAt as string | null | undefined) ?? null;
        session.userOnboardingCompletedAt =
          (token.userOnboardingCompletedAt as string | null | undefined) ?? null;
        session.organizationAccess =
          (token.organizationAccess as
            | "active"
            | "suspended"
            | "none"
            | undefined) ??
          (session.orgId ? "active" : "none");
        session.suspendedOrganizationName =
          (token.suspendedOrganizationName as string | null | undefined) ??
          null;
        return session;
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
