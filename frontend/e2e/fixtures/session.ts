import { encode } from "@auth/core/jwt";
import type { BrowserContext } from "@playwright/test";


const SESSION_COOKIE = "authjs.session-token";

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface SessionUser {
  userId: string;
  orgId: string;
  email: string;
  name?: string;
  isOrgOwner?: boolean;
  sessionId?: string;
}

function buildToken(user: SessionUser, now: number) {
  return {
    id: user.userId,
    email: user.email,
    name: user.name ?? user.email,
    orgId: user.orgId,
    isOrgOwner: user.isOrgOwner ?? true,
    isActive: true,
    organizationAccess: "active",
    orgOnboardingCompletedAt: new Date(now * 1000).toISOString(),
    userOnboardingCompletedAt: new Date(now * 1000).toISOString(),
    suspendedOrganizationName: null,
    authProvider: "credentials",

    sessionId: user.sessionId ?? crypto.randomUUID(),

    sub: user.userId,
    iat: now,
    exp: now + MAX_AGE_SECONDS,
    jti: crypto.randomUUID(),
  };
}

function sessionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET is unset. playwright.config.ts sets it on the server it starts; " +
        "this fixture must be given the same value or the cookie it mints cannot be decrypted.",
    );
  }
  return secret;
}

export async function mintSessionCookie(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    token: buildToken(user, now),
    secret: sessionSecret(),
    salt: SESSION_COOKIE,
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function signIn(
  context: BrowserContext,
  user: SessionUser,
  baseURL: string,
): Promise<void> {
  const value = await mintSessionCookie(user);
  const { hostname } = new URL(baseURL);

  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value,
      domain: hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    },
  ]);
}
