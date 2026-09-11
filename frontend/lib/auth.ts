import NextAuth from "next-auth";
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
  resolveGoogleUser,
  buildUserFromSessionData,
  unwrapBackend,
} from "@/lib/auth-session";
import { resolveSessionClaims } from "@/lib/auth-claims";

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
        if (typeof magicToken !== "string" || magicToken.length === 0)
          return null;
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
          const data = unwrapBackend<{ userId?: string; sessionId?: string }>(
            raw,
          );
          if (typeof data?.userId !== "string" || data.userId.length === 0)
            return null;
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
        if (sessionId) user.sessionId = sessionId;
        const sessionData = await fetchSessionData(userId);
        if (sessionData) {
          const claims = resolveSessionClaims(sessionData, {
            picture: user.image ?? undefined,
          });
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
        token.sessionId = user.sessionId ?? randomUUID();
        if (user.daysUntilExpiry !== undefined)
          token.daysUntilExpiry = user.daysUntilExpiry;
        token.authProvider = account?.provider ?? "credentials";
      }

      if (trigger === "update") {
        const userId = token.id;
        if (userId) {
          const fresh = await fetchSessionData(userId);
          if (fresh) {
            const claims = resolveSessionClaims(fresh, token);
            token.name = claims.name;
            token.orgId = claims.orgId;
            token.isOrgOwner = claims.isOrgOwner;
            token.role = claims.role;
            token.isActive = claims.isActive;
            token.orgOnboardingCompletedAt = claims.orgOnboardingCompletedAt;
            token.userOnboardingCompletedAt = claims.userOnboardingCompletedAt;
            token.organizationAccess = claims.organizationAccess;
            token.suspendedOrganizationName = claims.suspendedOrganizationName;
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
        const fresh = token.id
          ? await fetchSessionDataCached(token.id)
          : null;

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
        session.sessionId = token.sessionId;
        session.plan = claims.plan;
        session.enabledModules = claims.enabledModules;
        if (token.daysUntilExpiry !== undefined)
          session.daysUntilExpiry = token.daysUntilExpiry;
        session.authProvider = token.authProvider ?? "credentials";
        session.orgOnboardingCompletedAt = claims.orgOnboardingCompletedAt;
        session.userOnboardingCompletedAt = claims.userOnboardingCompletedAt;
        session.organizationAccess = claims.organizationAccess;
        session.suspendedOrganizationName = claims.suspendedOrganizationName;

        const sessionId = token.sessionId?.trim();
        if (token.id && sessionId) {
          const userId = token.id;
          const jwtCacheKey = `${userId}:${claims.orgId ?? ""}`;
          const cachedJwt = getBackendJwtFromStore(jwtCacheKey);
          if (cachedJwt) {
            session.backendJwt = cachedJwt;
          } else {
            const exchanged = await exchangeSessionForBackendJwt(
              userId,
              sessionId,
              claims.orgId,
            );
            if (exchanged) {
              setBackendJwtInStore(jwtCacheKey, exchanged);
              session.backendJwt = exchanged;
            }
          }
        }

        return session;
      } catch {
        const claims = resolveSessionClaims(null, token);
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
        session.sessionId = token.sessionId;
        session.plan = claims.plan;
        session.enabledModules = claims.enabledModules;
        session.authProvider = token.authProvider ?? "credentials";
        session.orgOnboardingCompletedAt = claims.orgOnboardingCompletedAt;
        session.userOnboardingCompletedAt = claims.userOnboardingCompletedAt;
        session.organizationAccess = claims.organizationAccess;
        session.suspendedOrganizationName = claims.suspendedOrganizationName;
        return session;
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
