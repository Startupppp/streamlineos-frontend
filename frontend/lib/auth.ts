import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import axios, { AxiosError } from "axios";
import { randomUUID } from "crypto";
import { SignJWT } from "jose";
import type { Plan } from "@/lib/billing/feature-gates";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

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
  isPasswordChangeRequired: boolean;
  branchId: number | null;
  totpEnabled: boolean;
  orgId: string | null;
  isOrgOwner: boolean;
  mfaEnforced: boolean;
  enabledModules: string[];
  orgOnboardingCompletedAt: string | null;
  userOnboardingCompletedAt: string | null;
  permissions: string[];
  plan: Plan | null;
}

async function fetchSessionData(userId: string): Promise<SessionData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${BACKEND_URL}/auth/session-data/${userId}`, {
      headers: { "x-internal-secret": INTERNAL_SECRET },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return res.json() as Promise<SessionData>;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

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
      body: JSON.stringify({ email, googleId, name: name ?? undefined, image: image ?? undefined }),
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as { success?: boolean; data?: { userId: string }; userId?: string };
    return raw?.data?.userId ?? raw?.userId ?? null;
  } catch {
    return null;
  }
}

function buildUserFromSessionData(userId: string, sessionData: SessionData, extra?: { forceChangePassword?: boolean; daysUntilExpiry?: number }) {
  return {
    id: userId,
    email: sessionData.email,
    name:
      sessionData.firstName && sessionData.lastName
        ? `${sessionData.firstName} ${sessionData.lastName}`
        : (sessionData.name ?? sessionData.email),
    image: sessionData.image,
    role: sessionData.role ?? undefined,
    forceChangePassword: extra?.forceChangePassword ?? false,
    isActive: sessionData.isActive,
    hasDashboardAccess: sessionData.hasDashboardAccess,
    orgId: sessionData.orgId ?? null,
    isOrgOwner: sessionData.isOrgOwner,
    orgOnboardingCompletedAt: sessionData.orgOnboardingCompletedAt ?? null,
    branchId: sessionData.branchId ?? null,
    totpEnabled: sessionData.totpEnabled,
    mfaEnforced: sessionData.mfaEnforced,
    permissions: sessionData.permissions,
    plan: sessionData.plan ?? null,
    enabledModules: sessionData.enabledModules,
    userOnboardingCompletedAt: sessionData.userOnboardingCompletedAt ?? null,
    isPlatformAdmin: isPlatformAdminEmail(sessionData.email),
    ...(extra?.daysUntilExpiry !== undefined ? { daysUntilExpiry: extra.daysUntilExpiry } : {}),
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
        password: { label: "Password", type: "password" },
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
            const data = unwrapBackend<{ userId: string; forceChangePassword: boolean }>(raw);
            const sessionData = await fetchSessionData(data.userId);
            if (!sessionData) return null;
            return buildUserFromSessionData(data.userId, sessionData, {
              forceChangePassword: data.forceChangePassword,
            });
          } catch {
            return null;
          }
        }

        if (!credentials?.email || !credentials?.password) return null;

        try {
          let raw: unknown = null;
          try {
            const response = await axios.post<unknown>(`${BACKEND_URL}/auth/login`, {
              email: credentials.email,
              password: credentials.password,
              totpCode: credentials.totpCode ?? undefined,
            });
            raw = response.data;
          } catch (loginErr: unknown) {
            if (loginErr instanceof AxiosError) {
              const errData = loginErr.response?.data as Record<string, unknown> | undefined;
              const code = typeof errData?.code === "string" ? errData.code : null;
              const details = errData?.details as Record<string, unknown> | undefined;
              if (code === "AUTH_ACCOUNT_LOCKED") {
                const retryAfterSeconds = typeof details?.retryAfterSeconds === "number" ? details.retryAfterSeconds : 900;
                throw new Error(`AUTH_ACCOUNT_LOCKED:${retryAfterSeconds}`);
              }
              if (code === "AUTH_SUBSCRIPTION_INACTIVE") throw new Error("AUTH_SUBSCRIPTION_INACTIVE");
              if (code === "AUTH_EMAIL_NOT_VERIFIED") throw new Error("AUTH_EMAIL_NOT_VERIFIED");
              if (code === "AUTH_INVALID_MFA_CODE") throw new Error("AUTH_INVALID_MFA_CODE");
            }
            return null;
          }

          if (!raw) return null;
          const data = unwrapBackend<{
            userId: string;
            orgId: string;
            forceChangePassword: boolean;
            daysUntilExpiry?: number;
            requiresMfa?: boolean;
          }>(raw);

          if (data.requiresMfa) throw new Error("AUTH_MFA_REQUIRED");

          const sessionData = await fetchSessionData(data.userId);
          if (!sessionData) return null;

          return buildUserFromSessionData(data.userId, sessionData, {
            forceChangePassword: data.forceChangePassword,
            daysUntilExpiry: data.daysUntilExpiry,
          });
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message.startsWith("AUTH_ACCOUNT_LOCKED:") ||
              err.message === "AUTH_SUBSCRIPTION_INACTIVE" ||
              err.message === "AUTH_MFA_REQUIRED" ||
              err.message === "AUTH_INVALID_MFA_CODE" ||
              err.message === "AUTH_EMAIL_NOT_VERIFIED")
          )
            throw err;
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
          user.orgOnboardingCompletedAt = sessionData.orgOnboardingCompletedAt ?? null;
          user.branchId = sessionData.branchId ?? null;
          user.totpEnabled = sessionData.totpEnabled;
          user.mfaEnforced = sessionData.mfaEnforced;
          user.permissions = sessionData.permissions;
          user.plan = sessionData.plan ?? null;
          user.enabledModules = sessionData.enabledModules;
          user.userOnboardingCompletedAt = sessionData.userOnboardingCompletedAt ?? null;
          user.isPlatformAdmin = isPlatformAdminEmail(sessionData.email);
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
        token.image = user.image ?? null;
        token.forceChangePassword = user.forceChangePassword ?? false;
        token.isActive = user.isActive ?? true;
        token.hasDashboardAccess = user.hasDashboardAccess ?? true;
        token.orgId = user.orgId ?? null;
        token.isOrgOwner = user.isOrgOwner ?? false;
        token.orgOnboardingCompletedAt = user.orgOnboardingCompletedAt ?? null;
        token.branchId = user.branchId ?? null;
        token.totpEnabled = user.totpEnabled ?? false;
        token.mfaEnforced = user.mfaEnforced ?? false;
        token.permissions = user.permissions ?? [];
        token.plan = user.plan ?? null;
        token.enabledModules = user.enabledModules ?? [];
        token.userOnboardingCompletedAt = user.userOnboardingCompletedAt ?? null;
        token.isPlatformAdmin = user.isPlatformAdmin ?? false;
        token.sessionId = randomUUID();
        if (user.daysUntilExpiry !== undefined) token.daysUntilExpiry = user.daysUntilExpiry;
        token.authProvider = account?.provider ?? "credentials";
      }

      if (trigger === "update") {
        const userId = token.id as string | undefined;
        if (userId) {
          const fresh = await fetchSessionData(userId);
          if (fresh) {
            token.orgId = fresh.orgId;
            token.isOrgOwner = fresh.isOrgOwner;
            token.orgOnboardingCompletedAt = fresh.orgOnboardingCompletedAt;
            token.userOnboardingCompletedAt = fresh.userOnboardingCompletedAt;
            token.permissions = fresh.permissions;
            token.enabledModules = fresh.enabledModules;
            token.plan = fresh.plan;
            token.role = fresh.role ?? undefined;
            token.branchId = fresh.branchId;
            token.mfaEnforced = fresh.mfaEnforced;
            token.totpEnabled = fresh.totpEnabled;
          }
        }
        if (session?.forceChangePassword !== undefined)
          token.forceChangePassword = session.forceChangePassword as boolean;
      }

      if (!token.sessionId) {
        token.sessionId = randomUUID();
      }

      return token;
    },

    async session({ session, token }) {
      let orgId = (token.orgId as string | null | undefined) ?? null;
      let isOrgOwner = (token.isOrgOwner as boolean | undefined) ?? false;
      let orgOnboardingCompletedAt = (token.orgOnboardingCompletedAt as string | null | undefined) ?? null;
      let userOnboardingCompletedAt = (token.userOnboardingCompletedAt as string | null | undefined) ?? null;
      let permissions = (token.permissions as string[] | undefined) ?? [];
      let enabledModules = (token.enabledModules as string[] | undefined) ?? [];
      let plan = (token.plan as Plan | null | undefined) ?? null;
      let role = (token.role as string | undefined) ?? "";
      let branchId = (token.branchId as number | null | undefined) ?? null;

      if (orgId === null && token.id) {
        const fresh = await fetchSessionData(token.id as string);
        if (fresh) {
          orgId = fresh.orgId;
          isOrgOwner = fresh.isOrgOwner;
          orgOnboardingCompletedAt = fresh.orgOnboardingCompletedAt;
          userOnboardingCompletedAt = fresh.userOnboardingCompletedAt;
          permissions = fresh.permissions;
          enabledModules = fresh.enabledModules;
          plan = fresh.plan;
          role = fresh.role ?? "";
          branchId = fresh.branchId;
        }
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = role;
        session.user.image = (token.image as string | null) ?? null;
        session.user.forceChangePassword = token.forceChangePassword as boolean;
        session.user.isActive = token.isActive as boolean;
        session.user.hasDashboardAccess = token.hasDashboardAccess as boolean;
        session.user.isPlatformAdmin = (token.isPlatformAdmin as boolean | undefined) ?? false;
        session.user.isOrgOwner = isOrgOwner;
      }
      session.orgId = orgId;
      session.branchId = branchId;
      session.sessionId = token.sessionId as string | undefined;
      session.plan = plan;
      session.permissions = permissions;
      session.enabledModules = enabledModules;
      session.orgOnboardingCompletedAt = orgOnboardingCompletedAt;
      session.userOnboardingCompletedAt = userOnboardingCompletedAt;
      if (token.daysUntilExpiry !== undefined)
        session.daysUntilExpiry = token.daysUntilExpiry as number;
      session.authProvider = (token.authProvider as string | undefined) ?? "credentials";

      const jwtSecret = process.env.BACKEND_JWT_SECRET;
      const sessionId = (token.sessionId as string | undefined)?.trim();
      if (jwtSecret && token.id && sessionId) {
        session.backendJwt = await new SignJWT({
          orgId,
          branchId,
          role,
          permissions,
          enabledModules,
          plan,
          isPlatformAdmin: (token.isPlatformAdmin as boolean | undefined) === true,
          isOrgOwner,
          sessionId,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setSubject(token.id as string)
          .setIssuedAt()
          .setExpirationTime("10m")
          .sign(new TextEncoder().encode(jwtSecret));
      }

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
