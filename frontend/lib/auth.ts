import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import axios, { AxiosError } from "axios";
import { randomUUID } from "crypto";
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
  try {
    const res = await fetch(`${BACKEND_URL}/auth/session-data/${userId}`, {
      headers: { "x-internal-secret": INTERNAL_SECRET },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<SessionData>;
  } catch {
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

export const { handlers, auth } = NextAuth({
  trustHost: true,
  basePath: "/api/auth",
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "text" },
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
            return {
              id: data.userId,
              email: sessionData.email,
              name:
                sessionData.firstName && sessionData.lastName
                  ? `${sessionData.firstName} ${sessionData.lastName}`
                  : (sessionData.name ?? sessionData.email),
              image: sessionData.image,
              role: sessionData.role ?? undefined,
              forceChangePassword: data.forceChangePassword,
              isActive: sessionData.isActive,
              hasDashboardAccess: sessionData.hasDashboardAccess,
            };
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
              rememberMe: credentials.rememberMe === "true",
            });
            raw = response.data;
          } catch (loginErr: unknown) {
            if (loginErr instanceof AxiosError) {
              const errData = loginErr.response?.data as Record<string, unknown> | undefined;
              const msgStr =
                typeof errData?.message === "string" ? errData.message : "Invalid credentials";
              if (msgStr.startsWith("ACCOUNT_LOCKED:") || msgStr === "SUBSCRIPTION_INACTIVE")
                throw new Error(msgStr);
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

          if (data.requiresMfa) throw new Error("REQUIRES_MFA");

          const sessionData = await fetchSessionData(data.userId);
          if (!sessionData) return null;

          return {
            id: data.userId,
            email: sessionData.email,
            name:
              sessionData.firstName && sessionData.lastName
                ? `${sessionData.firstName} ${sessionData.lastName}`
                : (sessionData.name ?? sessionData.email),
            image: sessionData.image,
            role: sessionData.role ?? undefined,
            forceChangePassword: data.forceChangePassword,
            isActive: sessionData.isActive,
            hasDashboardAccess: sessionData.hasDashboardAccess,
            daysUntilExpiry: data.daysUntilExpiry,
            rememberMe: credentials.rememberMe === "true",
          };
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message.startsWith("ACCOUNT_LOCKED:") ||
              err.message === "SUBSCRIPTION_INACTIVE" ||
              err.message === "REQUIRES_MFA" ||
              err.message === "INVALID_MFA_CODE")
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.image = user.image ?? null;
        token.forceChangePassword = user.forceChangePassword ?? false;
        token.isActive = user.isActive ?? true;
        token.hasDashboardAccess = user.hasDashboardAccess ?? true;
        token.orgId = null;
        token.sessionId = randomUUID();
        token.rememberMe = user.rememberMe ?? false;
        if (user.daysUntilExpiry !== undefined)
          token.daysUntilExpiry = user.daysUntilExpiry;
      }

      if (token.id) {
        const data = await fetchSessionData(token.id as string);
        if (data) {
          token.email = data.email;
          token.isActive = data.isActive;
          token.hasDashboardAccess = data.hasDashboardAccess;
          token.forceChangePassword = data.isPasswordChangeRequired;
          token.role = data.role ?? (token.role as string | undefined);
          token.image = data.image ?? null;
          token.orgId = data.orgId ?? null;
          token.branchId = data.branchId ?? null;
          token.totpEnabled = data.totpEnabled;
          token.mfaEnforced = data.mfaEnforced;
          token.permissions = data.permissions;
          token.plan = data.plan ?? null;
          token.isOrgOwner = data.isOrgOwner;
          token.enabledModules = data.enabledModules;
          token.orgOnboardingCompletedAt = data.orgOnboardingCompletedAt ?? null;
          token.userOnboardingCompletedAt = data.userOnboardingCompletedAt ?? null;
          token.isPlatformAdmin = isPlatformAdminEmail(data.email);
          if (data.firstName && data.lastName) {
            token.name = `${data.firstName} ${data.lastName}`;
          } else if (data.name) {
            token.name = data.name;
          }
        }
      }

      if (trigger === "update") {
        if (session?.forceChangePassword !== undefined) {
          token.forceChangePassword = session.forceChangePassword as boolean;
        }
        if (session?.orgId !== undefined) {
          token.orgId = session.orgId as string | null;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.image = (token.image as string | null) ?? null;
        session.user.forceChangePassword = token.forceChangePassword as boolean;
        session.user.isActive = token.isActive as boolean;
        session.user.hasDashboardAccess = token.hasDashboardAccess as boolean;
        session.user.isPlatformAdmin = (token.isPlatformAdmin as boolean | undefined) ?? false;
        session.user.isOrgOwner = (token.isOrgOwner as boolean | undefined) ?? false;
      }
      session.orgId = (token.orgId as string | null | undefined) ?? null;
      session.branchId = (token.branchId as number | null | undefined) ?? null;
      session.sessionId = token.sessionId as string | undefined;
      session.plan = (token.plan as Plan | null | undefined) ?? null;
      session.permissions = (token.permissions as string[] | undefined) ?? [];
      session.enabledModules = (token.enabledModules as string[] | undefined) ?? [];
      session.orgOnboardingCompletedAt =
        (token.orgOnboardingCompletedAt as string | null | undefined) ?? null;
      if (token.daysUntilExpiry !== undefined)
        session.daysUntilExpiry = token.daysUntilExpiry as number;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
