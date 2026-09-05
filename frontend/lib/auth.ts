import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import axios from "axios";
import { randomUUID } from "crypto";
import { headers as nextHeaders } from "next/headers";
import { BACKEND_URL } from "@/lib/backend-url";
import {
  resolveSessionDisplayName,
  getBackendJwtFromStore,
  setBackendJwtInStore,
  exchangeSessionForBackendJwt,
  fetchSessionData,
  fetchSessionDataCached,
  resolveGoogleUser,
  buildUserFromSessionData,
  unwrapBackend,
} from "@/lib/auth-session";
import { resolveSessionIsActive } from "@/lib/auth-is-active";

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
          user.name =
            resolveSessionDisplayName(sessionData) ||
            user.name ||
            user.email ||
            "";
          user.image = sessionData.image ?? user.image;
          user.role = sessionData.role ?? undefined;
          user.isActive = sessionData.isActive;
          user.orgId = sessionData.orgId ?? null;
          user.isOrgOwner = sessionData.isOrgOwner;
          user.branchId = sessionData.branchId ?? null;
          user.plan = sessionData.plan ?? null;
          user.enabledModules = sessionData.enabledModules;
          user.orgOnboardingCompletedAt = sessionData.orgOnboardingCompletedAt;
          user.userOnboardingCompletedAt =
            sessionData.userOnboardingCompletedAt;
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
        const userId = token.id;
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
            token.suspendedOrganizationName = fresh.suspendedOrganizationName;
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
        const tokenOrgId = token.orgId ?? null;
        const fresh = token.id
          ? await fetchSessionDataCached(token.id, tokenOrgId)
          : null;

        const orgId = fresh ? fresh.orgId : (token.orgId ?? null);
        const isOrgOwner = fresh
          ? fresh.isOrgOwner
          : (token.isOrgOwner ?? false);
        const enabledModules = fresh?.enabledModules ?? [];
        const plan = fresh?.plan ?? null;
        const role = fresh?.role ?? token.role ?? "";
        const branchId = fresh?.branchId ?? null;

        if (session.user) {
          session.user.id = token.id ?? session.user.id;
          session.user.email = token.email ?? session.user.email;
          session.user.name = fresh
            ? resolveSessionDisplayName(fresh)
            : (token.name ?? session.user.name ?? "");
          session.user.role = role;
          session.user.image = fresh?.image ?? token.picture ?? null;
          session.user.isActive = resolveSessionIsActive(fresh, token.isActive);
          session.user.isOrgOwner = isOrgOwner;
        }
        session.orgId = orgId;
        session.branchId = branchId;
        session.sessionId = token.sessionId;
        session.plan = plan;
        session.enabledModules = enabledModules;
        if (token.daysUntilExpiry !== undefined)
          session.daysUntilExpiry = token.daysUntilExpiry;
        session.authProvider = token.authProvider ?? "credentials";
        session.orgOnboardingCompletedAt =
          fresh?.orgOnboardingCompletedAt ??
          token.orgOnboardingCompletedAt ??
          null;
        session.userOnboardingCompletedAt =
          fresh?.userOnboardingCompletedAt ??
          token.userOnboardingCompletedAt ??
          null;
        session.organizationAccess =
          fresh?.organizationAccess ??
          token.organizationAccess ??
          (orgId ? "active" : "none");
        session.suspendedOrganizationName =
          fresh?.suspendedOrganizationName ??
          token.suspendedOrganizationName ??
          null;

        const sessionId = token.sessionId?.trim();
        if (token.id && sessionId) {
          const userId = token.id;
          const jwtCacheKey = `${userId}:${orgId ?? ""}`;
          const cachedJwt = getBackendJwtFromStore(jwtCacheKey);
          if (cachedJwt) {
            session.backendJwt = cachedJwt;
          } else {
            const exchanged = await exchangeSessionForBackendJwt(
              userId,
              sessionId,
              orgId,
            );
            if (exchanged) {
              setBackendJwtInStore(jwtCacheKey, exchanged);
              session.backendJwt = exchanged;
            }
          }
        }

        return session;
      } catch {
        if (session.user) {
          session.user.id = token.id ?? session.user.id;
          session.user.email = token.email ?? session.user.email;
          session.user.name = token.name ?? session.user.name ?? "";
          session.user.role = token.role ?? "";
          session.user.isActive = resolveSessionIsActive(null, token.isActive);
          session.user.isOrgOwner = token.isOrgOwner === true;
        }
        session.orgId = token.orgId ?? null;
        session.sessionId = token.sessionId;
        session.orgOnboardingCompletedAt =
          token.orgOnboardingCompletedAt ?? null;
        session.userOnboardingCompletedAt =
          token.userOnboardingCompletedAt ?? null;
        session.organizationAccess =
          token.organizationAccess ?? (session.orgId ? "active" : "none");
        session.suspendedOrganizationName =
          token.suspendedOrganizationName ?? null;
        return session;
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
