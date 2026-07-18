import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import axios from "axios";
import { randomUUID } from "crypto";
import { SignJWT, decodeJwt } from "jose";
import type { Plan } from "@/lib/billing/feature-gates";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

if (!BACKEND_URL) throw new Error("NEXT_PUBLIC_API_URL is not set");

const SESSION_DATA_TTL_MS = 30_000;
const sessionDataStore = new Map<string, { data: SessionData; expiresAt: number }>();

function getSessionDataFromStore(key: string): SessionData | null {
  const entry = sessionDataStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sessionDataStore.delete(key);
    return null;
  }
  return entry.data;
}

function setSessionDataInStore(key: string, data: SessionData): void {
  sessionDataStore.set(key, { data, expiresAt: Date.now() + SESSION_DATA_TTL_MS });
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

interface SessionData {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  image: string | null;
  role: string | null;
  isActive: boolean;
  hasDashboardAccess: boolean;
  branchId: number | null;
  totpEnabled: boolean;
  orgId: string | null;
  isOrgOwner: boolean;
  mfaEnforced: boolean;
  enabledModules: string[];
  permissions: string[];
  plan: Plan | null;
  orgOnboardingCompletedAt: string | null;
  userOnboardingCompletedAt: string | null;
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

async function fetchSessionDataWithCache(userId: string, orgId: string | null): Promise<SessionData | null> {
  const storeKey = `${userId}:${orgId ?? ""}`;
  const cached = getSessionDataFromStore(storeKey);
  if (cached) return cached;
  const data = await fetchSessionData(userId);
  if (data) setSessionDataInStore(storeKey, data);
  return data;
}

const fetchSessionDataCached = cache(fetchSessionDataWithCache);

function parsePlatformAdminEmails(): ReadonlySet<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

const PLATFORM_ADMIN_EMAILS = parsePlatformAdminEmails();

function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return PLATFORM_ADMIN_EMAILS.has(email.toLowerCase());
}

function unwrapBackend<T>(body: unknown): T {
  if (body !== null && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b.success === true && "data" in b) return b.data as T;
  }
  return body as T;
}

async function resolveGoogleUser(
  email: string,
  googleId: string,
  name?: string | null,
  image?: string | null,
): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
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
      data?: { userId: string };
      userId?: string;
    };
    return raw?.data?.userId ?? raw?.userId ?? null;
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
    name:
      sessionData.firstName && sessionData.lastName
        ? `${sessionData.firstName} ${sessionData.lastName}`
        : (sessionData.name ?? sessionData.email),
    image: sessionData.image,
    role: sessionData.role ?? undefined,
    isActive: sessionData.isActive,
    hasDashboardAccess: sessionData.hasDashboardAccess,
    orgId: sessionData.orgId ?? null,
    isOrgOwner: sessionData.isOrgOwner,
    branchId: sessionData.branchId ?? null,
    totpEnabled: sessionData.totpEnabled,
    mfaEnforced: sessionData.mfaEnforced,
    permissions: sessionData.permissions,
    plan: sessionData.plan ?? null,
    enabledModules: sessionData.enabledModules,
    orgOnboardingCompletedAt: sessionData.orgOnboardingCompletedAt,
    userOnboardingCompletedAt: sessionData.userOnboardingCompletedAt,
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
        email: { label: "Email", type: "email" },
        magicToken: { label: "Magic token", type: "text" },
        totpCode: { label: "MFA code", type: "text" },
      },
      async authorize(credentials) {
        if (credentials?.magicToken) {
          try {
            const { data: raw } = await axios.post<unknown>(
              `${BACKEND_URL}/auth/magic-link/verify`,
              { token: credentials.magicToken },
            );
            if (!raw) return null;
            const data = unwrapBackend<{
              userId: string;
            }>(raw);
            const sessionData = await fetchSessionData(data.userId);
            if (!sessionData) return null;
            return buildUserFromSessionData(data.userId, sessionData);
          } catch {
            return null;
          }
        }
        return null;
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
        const userId = await resolveGoogleUser(
          user.email ?? "",
          account.providerAccountId,
          user.name,
          user.image,
        );
        if (!userId) return false;
        user.id = userId;
        const sessionData = await fetchSessionData(userId);
        if (sessionData) {
          user.name =
            sessionData.firstName && sessionData.lastName
              ? `${sessionData.firstName} ${sessionData.lastName}`
              : (sessionData.name ?? user.name ?? user.email ?? "");
          user.image = sessionData.image ?? user.image;
          user.role = sessionData.role ?? undefined;
          user.isActive = sessionData.isActive;
          user.hasDashboardAccess = sessionData.hasDashboardAccess;
          user.orgId = sessionData.orgId ?? null;
          user.isOrgOwner = sessionData.isOrgOwner;

          user.branchId = sessionData.branchId ?? null;
          user.totpEnabled = sessionData.totpEnabled;
          user.mfaEnforced = sessionData.mfaEnforced;
          user.permissions = sessionData.permissions;
          user.plan = sessionData.plan ?? null;
          user.enabledModules = sessionData.enabledModules;
          user.orgOnboardingCompletedAt = sessionData.orgOnboardingCompletedAt;
          user.userOnboardingCompletedAt = sessionData.userOnboardingCompletedAt;
          user.isPlatformAdmin = isPlatformAdminEmail(sessionData.email);
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      // The cookie carries only identity, auth-flow flags, and the small advisory claims middleware reads; everything else (permissions, modules, plan, branch, image) is resolved live in the session callback.
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name ?? null;
        token.role = user.role;
        token.isActive = user.isActive ?? true;
        token.orgId = user.orgId ?? null;
        token.isOrgOwner = user.isOrgOwner ?? false;
        token.orgOnboardingCompletedAt = user.orgOnboardingCompletedAt ?? null;
        token.totpEnabled = user.totpEnabled ?? false;
        token.mfaEnforced = user.mfaEnforced ?? false;
        token.userOnboardingCompletedAt =
          user.userOnboardingCompletedAt ?? null;
        token.isPlatformAdmin = user.isPlatformAdmin ?? false;
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
            token.orgId = fresh.orgId;
            token.isOrgOwner = fresh.isOrgOwner;
            token.role = fresh.role ?? undefined;
            token.isActive = fresh.isActive;
            token.mfaEnforced = fresh.mfaEnforced;
            token.totpEnabled = fresh.totpEnabled;
            token.orgOnboardingCompletedAt = fresh.orgOnboardingCompletedAt;
            token.userOnboardingCompletedAt = fresh.userOnboardingCompletedAt;
          }
        }
      }

      if (!token.sessionId) {
        token.sessionId = randomUUID();
      }

      return token;
    },

    async session({ session, token }) {
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
      const permissions = fresh?.permissions ?? [];
      const enabledModules = fresh?.enabledModules ?? [];
      const plan = fresh?.plan ?? null;
      const role = fresh?.role ?? (token.role as string | undefined) ?? "";
      const branchId = fresh?.branchId ?? null;

      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = role;
        session.user.image =
          fresh?.image ?? (token.picture as string | null | undefined) ?? null;
        session.user.isActive = fresh?.isActive ?? (token.isActive as boolean);
        session.user.hasDashboardAccess = fresh?.hasDashboardAccess ?? true;
        session.user.isPlatformAdmin =
          (token.isPlatformAdmin as boolean | undefined) ?? false;
        session.user.isOrgOwner = isOrgOwner;
      }
      session.orgId = orgId;
      session.branchId = branchId;
      session.sessionId = token.sessionId as string | undefined;
      session.plan = plan;
      session.permissions = permissions;
      session.enabledModules = enabledModules;
      if (token.daysUntilExpiry !== undefined)
        session.daysUntilExpiry = token.daysUntilExpiry as number;
      session.authProvider =
        (token.authProvider as string | undefined) ?? "credentials";
      session.orgOnboardingCompletedAt =
        fresh?.orgOnboardingCompletedAt ?? token.orgOnboardingCompletedAt ?? null;
      session.userOnboardingCompletedAt =
        fresh?.userOnboardingCompletedAt ?? token.userOnboardingCompletedAt ?? null;

      const jwtSecret = process.env.BACKEND_JWT_SECRET;
      const sessionId = (token.sessionId as string | undefined)?.trim();
      if (jwtSecret && token.id && sessionId) {
        const userId = token.id as string;
        const jwtCacheKey = `${userId}:${orgId ?? ""}`;
        const cachedJwt = getBackendJwtFromStore(jwtCacheKey);
        if (cachedJwt) {
          session.backendJwt = cachedJwt;
        } else {
          const minted = await new SignJWT({
            orgId,
            branchId,
            role,
            enabledModules,
            plan,
            isPlatformAdmin:
              (token.isPlatformAdmin as boolean | undefined) === true,
            isOrgOwner,
            sessionId,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(userId)
            .setIssuedAt()
            .setExpirationTime("10m")
            .sign(new TextEncoder().encode(jwtSecret));
          setBackendJwtInStore(jwtCacheKey, minted);
          session.backendJwt = minted;
        }
      }

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
