import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { eq, sql, and } from "drizzle-orm";
import { Adapter } from "next-auth/adapters";
import { randomUUID } from "crypto";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { db } from "./db";
import { accounts, sessions, users, verificationTokens, organizationMembers, organizations, userSessions, subscriptions, userPermissions, rolePermissions, roles } from "./db/schema";
import type { Plan } from "@/lib/billing/feature-gates";
import { resolveEnabledModules, type Module } from "@/lib/billing/plan-modules";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";
import { logger } from "./logger";
import { redis } from "./redis";
import { createAuditLog } from "./audit-log";

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
async function getUserPermissions(userId: string, orgId: string): Promise<string[]> {
  const userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });
  const role = userRow?.role;

  const [userPerms, rolePerms, customRole] = await Promise.all([
    db.query.userPermissions.findMany({
      where: and(eq(userPermissions.userId, userId), eq(userPermissions.orgId, orgId), eq(userPermissions.granted, true)),
      with: { permission: true },
    }),
    role
      ? db.query.rolePermissions.findMany({
          where: and(eq(rolePermissions.role, role), eq(rolePermissions.orgId, orgId)),
          with: { permission: true },
        })
      : Promise.resolve([]),
    role
      ? db.query.roles.findFirst({
          where: and(eq(roles.slug, role), eq(roles.orgId, orgId)),
          columns: { permissions: true },
        })
      : Promise.resolve(null),
  ]);

  const permissionSet = new Set<string>();
  for (const up of userPerms) { if (up.permission?.name) permissionSet.add(up.permission.name); }
  for (const rp of rolePerms) { if (rp.permission?.name) permissionSet.add(rp.permission.name); }
  if (customRole?.permissions && Array.isArray(customRole.permissions)) {
    for (const p of customRole.permissions as string[]) permissionSet.add(p);
  }
  const defaultPerms = role ? (ROLE_DEFAULT_PERMISSIONS[role] ?? []) : [];
  defaultPerms.forEach((p) => permissionSet.add(p));
  return Array.from(permissionSet);
}

interface UserSessionCache {
  isActive: boolean | null;
  hasDashboardAccess: boolean | null;
  isPasswordChangeRequired: boolean | null;
  image: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  role: string | null;
  orgId: string | null;
  branchId: number | null;
  totpEnabled: boolean | null;
  mfaEnforced: boolean | null;
  permissions: string[];
  plan: Plan | null;
  isOrgOwner: boolean;
  enabledModules: Module[];
  orgOnboardingCompletedAt: string | null;
  userOnboardingCompletedAt: string | null;
}

const USER_SESSION_TTL = 300;

function userSessionKey(userId: string): string {
  return `user:session:${userId}`;
}

export async function invalidateUserSession(userId: string): Promise<void> {
  if (redis) {
    await redis.del(userSessionKey(userId));
  }
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const credentialsProvider = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
    rememberMe: { label: "Remember me", type: "text" },
    magicToken: { label: "Magic token", type: "text" },
  },
  async authorize(credentials) {
    if (credentials?.magicToken) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/magic-link/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: credentials.magicToken }),
        });
        if (!res.ok) return null;
        const data = await res.json() as { userId: string; orgId: string; forceChangePassword: boolean };
        const user = await db.query.users.findFirst({
          where: eq(users.id, data.userId),
          columns: { id: true, email: true, name: true, image: true, role: true, isActive: true, hasDashboardAccess: true, firstName: true, lastName: true, isPasswordChangeRequired: true },
        });
        if (!user) return null;
        const fullName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name ?? user.email;
        return {
          id: user.id,
          email: user.email,
          name: fullName,
          image: user.image,
          role: user.role,
          forceChangePassword: data.forceChangePassword,
          isActive: user.isActive,
          hasDashboardAccess: user.hasDashboardAccess ?? true,
        };
      } catch {
        return null;
      }
    }

    if (!credentials?.email || !credentials?.password) return null;

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        const msg = (data.message as string) ?? "Invalid credentials";
        if (msg.startsWith("ACCOUNT_LOCKED:") || msg === "SUBSCRIPTION_INACTIVE") throw new Error(msg);
        return null;
      }

      const data = await res.json() as { userId: string; orgId: string; forceChangePassword: boolean; daysUntilExpiry?: number };

      const user = await db.query.users.findFirst({
        where: eq(users.id, data.userId),
        columns: { id: true, email: true, name: true, image: true, role: true, isActive: true, hasDashboardAccess: true, firstName: true, lastName: true, isPasswordChangeRequired: true },
      });

      if (!user) return null;

      const fullName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name ?? user.email;

      logger.info("Auth: successful login via backend", { userId: user.id });
      return {
        id: user.id,
        email: user.email,
        name: fullName,
        image: user.image,
        role: user.role,
        forceChangePassword: data.forceChangePassword,
        isActive: user.isActive,
        hasDashboardAccess: user.hasDashboardAccess ?? true,
        daysUntilExpiry: data.daysUntilExpiry,
        rememberMe: credentials?.rememberMe === "true",
      };
    } catch (err) {
      if (err instanceof Error && (err.message.startsWith("ACCOUNT_LOCKED:") || err.message === "SUBSCRIPTION_INACTIVE")) throw err;
      logger.error("Auth: backend login error", { error: err });
      return null;
    }
  },
});

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    : null;

const microsoftProvider =
  process.env.MICROSOFT_CLIENT_ID &&
  process.env.MICROSOFT_CLIENT_SECRET &&
  process.env.MICROSOFT_TENANT_ID
    ? MicrosoftEntraID({
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0`,
      })
    : null;

const oauthProviders = [googleProvider, microsoftProvider].filter(
  (p): p is NonNullable<typeof p> => p !== null,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter,
  trustHost: true,
  basePath: "/api/auth",
  providers: oauthProviders.length > 0
    ? [credentialsProvider, ...oauthProviders]
    : [credentialsProvider],
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
      if (account?.provider === "google" || account?.provider === "microsoft-entra-id") {
        const existingUser = await db.query.users.findFirst({
          where: sql`lower(${users.email}) = ${(user.email ?? "").toLowerCase()}`,
        });
        if (!existingUser) {
          return false;
        }
        createAuditLog({
          action: account.provider === "microsoft-entra-id" ? "oauth.login.microsoft" : "oauth.login.google",
          userId: existingUser.id,
          metadata: { email: user.email },
        }).catch(() => {});
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.image = user.image;
        token.forceChangePassword = user.forceChangePassword;
        token.isActive = user.isActive;
        token.hasDashboardAccess = user.hasDashboardAccess ?? true;
        token.orgId = null;
        token.sessionId = randomUUID();
        token.rememberMe = user.rememberMe ?? false;
        if (user.daysUntilExpiry !== undefined) token.daysUntilExpiry = user.daysUntilExpiry;

        const deviceId = token.sessionId as string;

        db.insert(userSessions).values({
          id: token.sessionId,
          userId: user.id as string,
          deviceId,
        }).catch(() => {});

        createAuditLog({
          action: "user.login",
          userId: user.id as string,
          orgId: (token.orgId as string | null) ?? undefined,
          targetId: user.id as string,
          targetType: "user",
          metadata: { email: user.email },
        }).catch(() => {});
      }

      if (token.id) {
        try {
          const userId = token.id as string;
          let dbUser: UserSessionCache | null = null;

          if (redis) {
            dbUser = await redis.get<UserSessionCache>(userSessionKey(userId));
          }

          if (!dbUser) {
            const [fresh, membership] = await Promise.all([
              db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: {
                  isActive: true,
                  hasDashboardAccess: true,
                  isPasswordChangeRequired: true,
                  image: true,
                  firstName: true,
                  lastName: true,
                  name: true,
                  role: true,
                  branchId: true,
                  totpEnabled: true,
                  onboardingCompletedAt: true,
                },
              }),
              db.query.organizationMembers.findFirst({
                where: eq(organizationMembers.userId, userId),
                columns: { orgId: true, isOwner: true },
              }),
            ]);

            let mfaEnforcedValue = false;
            let orgEnabledModulesOverride: string[] | null = null;
            let orgOnboardingCompletedAt: string | null = null;
            if (membership?.orgId) {
              const orgRow = await db.query.organizations.findFirst({
                where: eq(organizations.id, membership.orgId),
                columns: { mfaEnforced: true, enabledModules: true, onboardingCompletedAt: true },
              });
              mfaEnforcedValue = orgRow?.mfaEnforced ?? false;
              orgEnabledModulesOverride = orgRow?.enabledModules ?? null;
              orgOnboardingCompletedAt = orgRow?.onboardingCompletedAt?.toISOString() ?? null;
            }

            let permissions: string[] = [];
            if (fresh && membership?.orgId) {
              permissions = await getUserPermissions(userId, membership.orgId).catch(() => []);
            }

            let plan: Plan | null = null;
            if (membership?.orgId) {
              const sub = await db.query.subscriptions.findFirst({
                where: eq(subscriptions.orgId, membership.orgId),
                columns: { plan: true, status: true },
              }).catch(() => null);
              if (sub && (sub.status === "ACTIVE" || sub.status === "TRIAL")) {
                plan = sub.plan as Plan;
              } else {
                plan = "FREE";
              }
            }

            const enabledModules = resolveEnabledModules(plan, orgEnabledModulesOverride);

            const cacheValue: UserSessionCache | null = fresh
              ? {
                  ...fresh,
                  orgId: membership?.orgId ?? null,
                  branchId: fresh.branchId ?? null,
                  totpEnabled: fresh.totpEnabled ?? false,
                  mfaEnforced: mfaEnforcedValue,
                  permissions,
                  plan,
                  isOrgOwner: membership?.isOwner ?? false,
                  enabledModules: [...enabledModules],
                  orgOnboardingCompletedAt,
                  userOnboardingCompletedAt: fresh.onboardingCompletedAt
                    ? fresh.onboardingCompletedAt.toISOString()
                    : null,
                }
              : null;
            if (cacheValue && redis) {
              await redis.set(userSessionKey(userId), cacheValue, { ex: USER_SESSION_TTL });
            }
            dbUser = cacheValue;
          }

          if (dbUser) {
            token.isActive = dbUser.isActive ?? undefined;
            token.hasDashboardAccess = dbUser.hasDashboardAccess ?? true;
            token.forceChangePassword = dbUser.isPasswordChangeRequired || false;
            token.role = dbUser.role || token.role;
            token.image = dbUser.image || null;
            token.orgId = dbUser.orgId ?? null;
            token.branchId = dbUser.branchId ?? null;
            token.totpEnabled = dbUser.totpEnabled ?? false;
            token.mfaEnforced = dbUser.mfaEnforced ?? false;
            token.permissions = dbUser.permissions ?? [];
            token.plan = dbUser.plan ?? null;
            token.isOrgOwner = dbUser.isOrgOwner ?? false;
            token.enabledModules = dbUser.enabledModules ?? [];
            token.orgOnboardingCompletedAt = dbUser.orgOnboardingCompletedAt ?? null;
            token.userOnboardingCompletedAt = dbUser.userOnboardingCompletedAt ?? null;
            token.isPlatformAdmin = isPlatformAdminEmail(token.email as string | null | undefined);
            if (dbUser.firstName && dbUser.lastName) {
              token.name = `${dbUser.firstName} ${dbUser.lastName}`;
            } else if (dbUser.name) {
              token.name = dbUser.name;
            }
          }

          if (redis && token.sessionId) {
            await redis.set(
              `session:activity:${token.sessionId as string}`,
              Date.now(),
              { ex: 7200 }
            ).catch(() => {});
          }
        } catch {

        }
      }

      if (trigger === "update") {
        if (session?.forceChangePassword !== undefined) {
          token.forceChangePassword = session.forceChangePassword;
        }
        if (session?.orgId !== undefined) {
          token.orgId = session.orgId;
          if (redis) {
            await redis.del(userSessionKey(token.id as string)).catch(() => {});
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.image = (token.image as string) || null;
        session.user.forceChangePassword = token.forceChangePassword as boolean;
        session.user.isActive = token.isActive as boolean;
        session.user.hasDashboardAccess = token.hasDashboardAccess as boolean;
      }
      session.orgId = token.orgId ?? null;
      session.branchId = token.branchId ?? null;
      session.sessionId = token.sessionId;
      session.plan = token.plan ?? null;
      session.permissions = token.permissions ?? [];
      session.enabledModules = token.enabledModules ?? [];
      if (token.daysUntilExpiry !== undefined) session.daysUntilExpiry = token.daysUntilExpiry;
      if (session.user) {
        session.user.isPlatformAdmin = token.isPlatformAdmin ?? false;
        session.user.isOrgOwner = token.isOrgOwner ?? false;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
