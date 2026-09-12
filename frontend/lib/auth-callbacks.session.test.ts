/**
 * @jest-environment node
 *
 * Drives the session callback seam in `lib/auth.ts` — the `session` callback —
 * not a reimplementation of it.
 */
jest.mock("@/lib/backend-url", () => ({ BACKEND_URL: "http://backend.test" }));

jest.mock("axios", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock("jose", () => {
  function decodeJwt(token: string): Record<string, unknown> {
    const parts = token.split(".");
    if (parts.length < 2) throw new Error("Invalid JWT format");
    return JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    ) as Record<string, unknown>;
  }
  class SignJWT {
    setProtectedHeader() { return this; }
    setSubject() { return this; }
    setIssuer() { return this; }
    setAudience() { return this; }
    setJti() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    sign() { return Promise.resolve("proof.jwt.value"); }
  }
  return { decodeJwt, SignJWT };
});

import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { resolveAuthSession } from "@/lib/auth";
import {
  clearBackendJwtStoreForTesting,
  getBackendJwtFromStore,
} from "@/lib/auth-session";
import {
  USER,
  ORG,
  ORG_OTHER,
  SESSION_A,
  SESSION_B,
  backendJwt,
  installTransport,
  installMintingTransport,
  makeSession,
  makeToken,
} from "./__tests__/auth-callbacks-test-helpers";

const ORIGINAL_ENV = process.env;

beforeAll(() => {
  process.env = {
    ...ORIGINAL_ENV,
    INTERNAL_API_SECRET: "probe-internal-secret",
    NEXTAUTH_SECRET: "probe-nextauth-secret-at-least-32-characters",
  };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

beforeEach(() => {
  jest.clearAllMocks();
  clearBackendJwtStoreForTesting();
});

describe("session callback — minting, caching and two device sessions", () => {
  it("exchanges once and serves the cached token on the next read", async () => {
    const transport = installTransport({ exchangeToken: backendJwt(SESSION_A, ORG) });

    const first = await resolveAuthSession(makeSession(), makeToken(SESSION_A));
    const second = await resolveAuthSession(makeSession(), makeToken(SESSION_A));

    expect(first.backendJwt).toBe(backendJwt(SESSION_A, ORG));
    expect(second.backendJwt).toBe(first.backendJwt);
    expect(transport.exchangeCalls).toBe(1);
  });

  it("gives two device sessions of one user their own token, under their own key", async () => {
    // The exchange body carries only `orgId`; the session id travels in the
    // signed proof header, so which session a token BELONGS to is decided by the
    // backend and is proved there (`pnpm verify:identity-journey` decodes the
    // sessionId claim from the real token). What the web tier owes is that two
    // sessions never share a cache entry, which is what this asserts.
    installMintingTransport();

    const a = await resolveAuthSession(makeSession(), makeToken(SESSION_A));
    const b = await resolveAuthSession(makeSession(), makeToken(SESSION_B));

    expect(a.backendJwt).toBeDefined();
    expect(b.backendJwt).toBeDefined();
    expect(a.backendJwt).not.toBe(b.backendJwt);
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBe(a.backendJwt);
    expect(getBackendJwtFromStore(`${USER}:${SESSION_B}:${ORG}`)).toBe(b.backendJwt);
  });

  it("never exchanges for a session the backend did not register", async () => {
    const transport = installTransport();

    const session = await resolveAuthSession(
      makeSession(),
      makeToken("~local-only-session"),
    );

    expect(transport.exchangeCalls).toBe(0);
    expect(session.backendJwt).toBeUndefined();
    expect(session.sessionId).toBe("local-only-session");
  });

  it("(negative) a refused exchange leaves no token on the session and caches nothing", async () => {
    const transport = installTransport({ exchangeStatus: 401 });

    const session = await resolveAuthSession(makeSession(), makeToken(SESSION_A));

    expect(session.backendJwt).toBeUndefined();
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBeNull();
    expect(transport.exchangeCalls).toBe(1);
  });

  it("keys the cache by the active organization, so a switch cannot serve the old scope", async () => {
    let activeOrg: string = ORG;
    installMintingTransport(() => activeOrg);

    const before = await resolveAuthSession(makeSession(), makeToken(SESSION_A));
    activeOrg = ORG_OTHER;
    const after = await resolveAuthSession(makeSession(), makeToken(SESSION_A, ORG_OTHER));

    expect(before.orgId).toBe(ORG);
    expect(after.orgId).toBe(ORG_OTHER);
    expect(after.backendJwt).not.toBe(before.backendJwt);
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBe(before.backendJwt);
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG_OTHER}`)).toBe(
      after.backendJwt,
    );
  });

  it("degrades to the token's own claims when the identity read fails, and still mints for the token's org", async () => {
    const transport = installTransport({ sessionDataStatus: 503 });

    const session = await resolveAuthSession(makeSession(), makeToken(SESSION_A));

    expect(transport.sessionDataCalls).toBe(2);
    expect(session.user.id).toBe(USER);
    expect(session.sessionId).toBe(SESSION_A);
    // `resolveSessionClaims(null, token)` falls back to the token, so the org is
    // still known and the exchange still runs. A session-data outage degrades
    // freshness, it does not sign the user out.
    expect(session.orgId).toBe(ORG);
    expect(session.plan).toBeNull();
    expect(session.enabledModules).toEqual([]);
    expect(session.backendJwt).toBeDefined();
    expect(transport.exchangeBodies).toEqual([{ orgId: ORG }]);
  });

  it("(negative) an identity read failure on a token with no org mints nothing org-scoped", async () => {
    const transport = installTransport({ sessionDataStatus: 503 });

    const session = await resolveAuthSession(
      makeSession(),
      makeToken(SESSION_A, null),
    );

    expect(session.orgId).toBeNull();
    expect(session.organizationAccess).toBe("none");
    expect(transport.exchangeBodies).toEqual([{ orgId: null }]);
  });
});
