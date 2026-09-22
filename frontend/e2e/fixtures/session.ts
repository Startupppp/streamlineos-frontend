import { encode } from "@auth/core/jwt";
import type { BrowserContext } from "@playwright/test";

/**
 * Minting a signed-in browser without going through the UI.
 *
 * Sign-in here is passwordless: the form posts an email, the backend mails a
 * six-digit code, and nothing in a browser can read that mailbox. So a UI login
 * is not a slower path to a session, it is a closed one — the session has to be
 * constructed.
 *
 * It is a NextAuth v5 JWE, not a bearer JWT, and the two are not
 * interchangeable: the server decrypts the cookie with `@auth/core`'s own
 * `encode`/`decode` pair, which derive their key from the secret AND the salt
 * via HKDF. Hand-rolling a JWT with `jose` produces something that verifies
 * against nothing and reads to the app as a signed-out visitor.
 */

/**
 * The salt is the cookie name, and it is not decoration — `encode` feeds it to
 * HKDF, so a token minted under one name cannot be read under another. Getting
 * this wrong yields a cookie the server silently ignores, which looks exactly
 * like a session that expired.
 *
 * Unprefixed because the suite runs on http. Over https NextAuth switches to
 * `__Secure-authjs.session-token` and both halves have to move together.
 */
const SESSION_COOKIE = "authjs.session-token";

/** `lib/auth.ts`: `session.maxAge = 30 * 24 * 60 * 60`. */
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface SessionUser {
  /** `users.id`. The backend resolves the tenant from this, so it must exist. */
  userId: string;
  /** `organizations.id`. */
  orgId: string;
  email: string;
  name?: string;
  /**
   * Owners short-circuit `useCan` to true on the client and hold every
   * permission on the server, which keeps a UI test about the flow rather than
   * about the role. Assert permission behaviour with a non-owner deliberately.
   */
  isOrgOwner?: boolean;
  /**
   * A `user_sessions.id` the backend has registered. `POST /auth/session-exchange`
   * refuses a session it has never seen, so a minted cookie only becomes a
   * backend JWT when this names an unrevoked row. Omitted, a fresh random id is
   * minted per context, which is enough for specs that never reach the API.
   */
  sessionId?: string;
}

/**
 * The claims `lib/auth.ts`'s `jwt` callback would have written.
 *
 * `orgOnboardingCompletedAt` is the one that is easy to miss and expensive to
 * debug: `resolveWizardGate` sends an owner whose org has not finished setup to
 * `/org-setup`, so a session that is otherwise perfect lands on the wizard and
 * every assertion fails on a page that is not the one under test.
 */
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

    /**
     * Signed into the backend JWT the session callback mints, and the backend
     * ties its rate limits and audit rows to it. A fresh one per context keeps
     * two specs from sharing a session identity.
     */
    sessionId: user.sessionId ?? crypto.randomUUID(),

    sub: user.userId,
    iat: now,
    exp: now + MAX_AGE_SECONDS,
    jti: crypto.randomUUID(),
  };
}

/**
 * The secret must be the one the server under test is running with. The
 * Playwright config sets it on the webServer it starts, and both sides read it
 * from here, so they cannot drift.
 */
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

/** Mints the cookie value alone, for tests that want to assert on it. */
export async function mintSessionCookie(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    token: buildToken(user, now),
    secret: sessionSecret(),
    salt: SESSION_COOKIE,
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Installs the session into a browser context. Every page opened from that
 * context afterwards is signed in as `user`.
 */
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
      /**
       * `domain` + `path`, not `url`. A cookie scoped to the URL's full path is
       * absent on every other route, so the session works on the page you
       * seeded it from and nowhere else.
       *
       * The hostname comes from `baseURL` rather than being written out, because
       * `localhost` and `127.0.0.1` are different cookie domains: mint on one,
       * browse the other, and the request simply carries no cookie.
       */
      domain: hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    },
  ]);
}
