import NextAuth, {
  type NextAuthConfig,
  type Session,
  type User,
} from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import axios from "axios";
import { randomUUID } from "crypto";
import { headers as nextHeaders } from "next/headers";
import { BACKEND_URL } from "@/lib/backend-url";
import {
  getBackendJwtFromStore,
  setBackendJwtInStore,
  exchangeSessionForBackendJwt,
  fetchSessionData,
  fetchSessionDataCached,
  invalidateSessionData,
  primeSessionData,
  invalidateBackendJwtSession,
  resolveGoogleUser,
  buildUserFromSessionData,
  unwrapBackend,
} from "@/lib/auth-session";
import {
  magicLinkVerifyResponseSchema,
  type SessionData,
} from "@/lib/auth-session-schema";
import { resolveSessionClaims } from "@/lib/auth-claims";

function cleanSessionId(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  return raw.startsWith("~") ? raw.slice(1) : raw;
}

/**
 * The credentials provider's `authorize`, lifted out of the config literal.
 *
 * Auth.js types the `session` callback's parameter as an intersection of the
 * database-strategy and JWT-strategy shapes, which no value can inhabit, so a
 * test cannot call it without a cast. These named functions hold the real
 * implementation and the callbacks below are one-line delegations to them, so a
 * test drives production code through a signature it can actually construct.
 */
export async function authorizeMagicToken(
  magicToken: unknown,
  requestHeaders: Headers,
): Promise<User | null> {
  if (typeof magicToken !== "string" || magicToken.length === 0) return null;
  try {
    const ua = requestHeaders.get("user-agent") ?? null;
    const rawIp =
      requestHeaders.get("x-forwarded-for") ??
      requestHeaders.get("x-real-ip") ??
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
        timeout: 8_000,
      },
    );
    const identity = magicLinkVerifyResponseSchema.safeParse(unwrapBackend(raw));
    if (!identity.success) return null;
    invalidateSessionData(identity.data.userId);
    const sessionData = await fetchSessionData(identity.data.userId);
    if (!sessionData) return null;
    const magicUser = buildUserFromSessionData(identity.data.userId, sessionData);
    primeSessionData(identity.data.userId, sessionData, magicUser.orgId);
    return { ...magicUser, sessionId: identity.data.sessionId };
  } catch {
    return null;
  }
}

function applyClaimsToSession(session: Session, token: JWT, fresh: SessionData | null): void {
  const claims = resolveSessionClaims(fresh, token);
  if (session.user) {
    session.user.id = token.id ?? session.user.id;
    session.user.email = token.email ?? session.user.email;
    session.user.name = claims.name;
    session.user.role = claims.role;
    session.user.image = claims.image;
    session.user.isActive = claims.isActive;
    session.user.isOrgOwner = claims.isOrgOwner;
  }
  session.orgId = claims.orgId;
  session.sessionId = cleanSessionId(token.sessionId);
  session.plan = claims.plan;
  session.enabledModules = claims.enabledModules;
  session.authProvider = token.authProvider ?? "credentials";
  session.orgOnboardingCompletedAt = claims.orgOnboardingCompletedAt;
  session.userOnboardingCompletedAt = claims.userOnboardingCompletedAt;
  session.organizationAccess = claims.organizationAccess;
  session.suspendedOrganizationName = claims.suspendedOrganizationName;
  session.isPlatformAdmin = claims.isPlatformAdmin;
}

export async function resolveAuthSession(
  session: Session,
  token: JWT,
): Promise<Session> {
  try {
    const fresh = token.id
      ? await fetchSessionDataCached(token.id, token.orgId)
      : null;

    applyClaimsToSession(session, token, fresh);
    if (token.daysUntilExpiry !== undefined)
      session.daysUntilExpiry = token.daysUntilExpiry;

    const rawSessionId = token.sessionId?.trim();
    const sessionIsRegistered =
      typeof rawSessionId === "string" && !rawSessionId.startsWith("~");
    if (token.id && rawSessionId && sessionIsRegistered) {
      const userId = token.id;
      const jwtCacheKey = `${userId}:${rawSessionId}:${session.orgId ?? ""}`;
      const cachedJwt = getBackendJwtFromStore(jwtCacheKey);
      if (cachedJwt) {
        session.backendJwt = cachedJwt;
      } else {
        const exchanged = await exchangeSessionForBackendJwt(
          userId,
          rawSessionId,
          session.orgId ?? null,
        );
        if (exchanged) {
          setBackendJwtInStore(jwtCacheKey, exchanged);
          session.backendJwt = exchanged;
        }
      }
    }

    return session;
  } catch {
    applyClaimsToSession(session, token, null);
    return session;
  }
}

/**
 * The one place the web tier learns a device session has ended. It runs
 * server-side inside the Auth.js route handler with the decoded JWT, so it can
 * reach the in-process mint cache that a browser-side `signOut()` never could.
 * Revoking a DIFFERENT device is not observable here and is not meant to be:
 * that is answered by the backend's tombstone plus `user_sessions.is_revoked` on
 * every request, with this cache bounded by the token's own expiry.
 */
export function endBackendJwtSession(token: JWT | null): void {
  if (!token) return;
  const userId = token.id;
  const sessionId = token.sessionId?.trim();
  if (!userId || !sessionId) return;
  invalidateBackendJwtSession(userId, sessionId);
}

/**
 * Exported so tests drive the REAL callbacks rather than a reimplementation of
 * them; `NextAuth` below receives this exact object.
 */
export const authConfig = {
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
      authorize(credentials, request) {
        return authorizeMagicToken(credentials?.magicToken, request.headers);
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
        } catch {}
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
        user.sessionId = sessionId;
        invalidateSessionData(userId);
        const sessionData = await fetchSessionData(userId);
        if (sessionData) {
          const claims = resolveSessionClaims(sessionData, {
            picture: user.image ?? undefined,
          });
          primeSessionData(userId, sessionData, claims.orgId);
          user.name = claims.name || user.name || user.email || "";
          user.image = claims.image;
          user.role = claims.role;
          user.isActive = claims.isActive;
          user.orgId = claims.orgId;
          user.isOrgOwner = claims.isOrgOwner;
          user.plan = claims.plan;
          user.enabledModules = claims.enabledModules;
          user.orgOnboardingCompletedAt = claims.orgOnboardingCompletedAt;
          user.userOnboardingCompletedAt = claims.userOnboardingCompletedAt;
          user.organizationAccess = claims.organizationAccess;
          user.suspendedOrganizationName = claims.suspendedOrganizationName;
          user.isPlatformAdmin = claims.isPlatformAdmin;
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name ?? null;
        token.role = user.role ?? "";
        token.isActive = user.isActive ?? true;
        token.orgId = user.orgId ?? null;
        token.isOrgOwner = user.isOrgOwner ?? false;
        token.orgOnboardingCompletedAt = user.orgOnboardingCompletedAt ?? null;
        token.userOnboardingCompletedAt =
          user.userOnboardingCompletedAt ?? null;
        token.organizationAccess = user.organizationAccess ?? "none";
        token.suspendedOrganizationName =
          user.suspendedOrganizationName ?? null;
        token.isPlatformAdmin = user.isPlatformAdmin ?? false;
        token.sessionId = user.sessionId ?? `~${randomUUID()}`;
        if (user.daysUntilExpiry !== undefined)
          token.daysUntilExpiry = user.daysUntilExpiry;
        token.authProvider = account?.provider ?? "credentials";
      }

      if (trigger === "update") {
        const userId = token.id;
        if (userId) {
          invalidateSessionData(userId);
          const fresh = await fetchSessionData(userId);
          if (fresh) {
            const claims = resolveSessionClaims(fresh, token);
            primeSessionData(userId, fresh, claims.orgId);
            token.name = claims.name;
            token.orgId = claims.orgId;
            token.isOrgOwner = claims.isOrgOwner;
            token.role = claims.role;
            token.isActive = claims.isActive;
            token.orgOnboardingCompletedAt = claims.orgOnboardingCompletedAt;
            token.userOnboardingCompletedAt = claims.userOnboardingCompletedAt;
            token.organizationAccess = claims.organizationAccess;
            token.suspendedOrganizationName = claims.suspendedOrganizationName;
            token.isPlatformAdmin = claims.isPlatformAdmin;
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
        token.sessionId = `~${randomUUID()}`;
      }

      return token;
    },

    session({ session, token }) {
      return resolveAuthSession(session, token);
    },
  },

  events: {
    signOut(message) {
      if (!("token" in message)) return;
      endBackendJwtSession(message.token);
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
