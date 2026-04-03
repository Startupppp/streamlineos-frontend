import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { accounts, sessions, users, verificationTokens, organizationMembers, organizations } from "./db/schema";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { Adapter } from "next-auth/adapters";
import { logger } from "./logger";
import { redis } from "./redis";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter,
  trustHost: true,
  basePath: "/api/auth",
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = (credentials.email as string).toLowerCase().trim();

        const user = await db.query.users.findFirst({
          where: sql`lower(${users.email}) = ${normalizedEmail}`,
        });

        if (!user || !user.password) {
          logger.warn("Auth: login attempt for non-existent account", { email: normalizedEmail });
          return null;
        }

        if (user.isActive === false) {
          logger.warn("Auth: login attempt on deactivated account", { userId: user.id, email: normalizedEmail });
          return null;
        }

        if (!user.emailVerified) {
          logger.warn("Auth: login attempt on unverified email", { userId: user.id, email: normalizedEmail });
          return null;
        }

        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          logger.warn("Auth: login attempt on locked account", { userId: user.id, email: normalizedEmail, lockedUntil: user.lockedUntil });
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          const attempts = (user.loginAttempts ?? 0) + 1;
          const lockUpdate: Record<string, unknown> = { loginAttempts: attempts };
          if (attempts >= 10) {
            lockUpdate.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
            logger.warn("Auth: account locked after 10 failed attempts", { userId: user.id, email: normalizedEmail });
          } else {
            logger.warn("Auth: failed login attempt", { userId: user.id, email: normalizedEmail, attempt: attempts });
          }
          await db.update(users).set(lockUpdate).where(eq(users.id, user.id));
          return null;
        }

        // Successful login
        logger.info("Auth: successful login", { userId: user.id, email: normalizedEmail });

        if (user.loginAttempts && user.loginAttempts > 0) {
          await db.update(users).set({ loginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
        }

        // Single-org auto-membership: ensure user belongs to the organization
        const existingMembership = await db.query.organizationMembers.findFirst({
          where: eq(organizationMembers.userId, user.id),
        });
        if (!existingMembership) {
          const org = await db.query.organizations.findFirst();
          if (org) {
            await db
              .insert(organizationMembers)
              .values({
                userId: user.id,
                orgId: org.id,
                role: user.role || "ENGINEERING",
              })
              .onConflictDoNothing();
          }
        }

        const fullName =
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.name || user.email;

        const role = user.role;
        const forceChangePassword = user.isPasswordChangeRequired || false;

        return {
          id: user.id,
          email: user.email,
          name: fullName,
          image: user.image,
          role: role,

          forceChangePassword: forceChangePassword,
          isActive: user.isActive,
          hasDashboardAccess: user.hasDashboardAccess ?? true,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
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
        token.image = user.image;
        token.forceChangePassword = user.forceChangePassword;
        token.isActive = user.isActive;
        token.hasDashboardAccess = user.hasDashboardAccess ?? true;
        token.orgId = null;
      }

      // Refresh critical fields from cache/DB (with error handling to prevent auth crashes)
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
                },
              }),
              db.query.organizationMembers.findFirst({
                where: eq(organizationMembers.userId, userId),
                columns: { orgId: true },
              }),
            ]);
            const cacheValue: UserSessionCache | null = fresh
              ? { ...fresh, orgId: membership?.orgId ?? null, branchId: fresh.branchId ?? null }
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
            if (dbUser.firstName && dbUser.lastName) {
              token.name = `${dbUser.firstName} ${dbUser.lastName}`;
            } else if (dbUser.name) {
              token.name = dbUser.name;
            }
          }
        } catch {
          // DB/cache query failed — keep existing token values
        }
      }

      if (trigger === "update" && session?.forceChangePassword !== undefined) {
        token.forceChangePassword = session.forceChangePassword;
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
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});
