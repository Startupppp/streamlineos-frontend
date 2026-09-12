/**
 * @jest-environment node
 *
 * Drives the production NextAuth seams in `lib/auth.ts` — the credentials
 * `authorize`, the `session` callback and the `signOut` event — not a
 * reimplementation of them. `authConfig` is the exact object handed to
 * `NextAuth()`, and each callback body below is reached through it.
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

import axios from "axios";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import {
  authConfig,
  authorizeMagicToken,
  endBackendJwtSession,
  resolveAuthSession,
} from "@/lib/auth";
import {
  clearBackendJwtStoreForTesting,
  getBackendJwtFromStore,
} from "@/lib/auth-session";

const USER = "11111111-1111-4111-8111-111111111111";
const SESSION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SESSION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ORG = "22222222-2222-4222-8222-222222222222";
const ORG_OTHER = "33333333-3333-4333-8333-333333333333";

const postMock = axios.post as unknown as jest.Mock;

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

function sessionDataPayload(orgId: string | null): Record<string, unknown> {
  return {
    userId: USER,
    email: "probe@example.test",
    firstName: "Probe",
    lastName: "User",
    name: "Probe User",
    image: null,
    role: "MEMBER",
    isActive: true,
    orgId,
    isOrgOwner: false,
    enabledModules: ["build"],
    plan: null,
    orgOnboardingCompletedAt: null,
    userOnboardingCompletedAt: null,
    organizationAccess: orgId ? "active" : "none",
    suspendedOrganizationName: null,
    isPlatformAdmin: false,
  };
}

function backendJwt(sessionId: string, orgId: string | null): string {
  const header = Buffer.from('{"alg":"RS256"}').toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: USER,
      sessionId,
      orgId,
      exp: Math.floor(Date.now() / 1000) + 3_600,
    }),
  ).toString("base64url");
  return `${header}.${payload}.signature-${sessionId}-${orgId ?? "none"}`;
}

interface TransportPlan {
  sessionDataOrgId?: string | null;
  sessionDataStatus?: number;
  exchangeStatus?: number;
  exchangeToken?: string;
}

interface Transport {
  sessionDataCalls: number;
  exchangeCalls: number;
  exchangeBodies: unknown[];
}

function installTransport(plan: TransportPlan = {}): Transport {
  const state: Transport = {
    sessionDataCalls: 0,
    exchangeCalls: 0,
    exchangeBodies: [],
  };
  const {
    sessionDataOrgId = ORG,
    sessionDataStatus = 200,
    exchangeStatus = 200,
    exchangeToken,
  } = plan;

  const fetchMock = jest.fn((url: unknown, init?: RequestInit) => {
    const href = String(url);
    if (href.includes("/auth/session-data/")) {
      state.sessionDataCalls += 1;
      return Promise.resolve({
        ok: sessionDataStatus >= 200 && sessionDataStatus < 300,
        status: sessionDataStatus,
        json: () =>
          Promise.resolve({
            success: true,
            data: sessionDataPayload(sessionDataOrgId),
          }),
      } as Response);
    }
    if (href.includes("/auth/session-exchange")) {
      state.exchangeCalls += 1;
      state.exchangeBodies.push(
        typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      );
      const ok = exchangeStatus >= 200 && exchangeStatus < 300;
      return Promise.resolve({
        ok,
        status: exchangeStatus,
        json: () =>
          Promise.resolve({
            success: true,
            data: { token: exchangeToken ?? backendJwt(SESSION_A, ORG) },
          }),
      } as Response);
    }
    throw new Error(`unexpected fetch in test: ${href}`);
  });
  Object.defineProperty(globalThis, "fetch", {
    value: fetchMock,
    configurable: true,
    writable: true,
  });
  return state;
}

/** A transport whose every exchange mints a token nobody else was handed. */
function installMintingTransport(orgIdOf: () => string | null = () => ORG): Transport {
  const state = installTransport();
  const fetchMock = globalThis.fetch as unknown as jest.Mock;
  let minted = 0;
  fetchMock.mockImplementation((url: unknown) => {
    const href = String(url);
    if (href.includes("/auth/session-data/")) {
      state.sessionDataCalls += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ success: true, data: sessionDataPayload(orgIdOf()) }),
      } as Response);
    }
    state.exchangeCalls += 1;
    minted += 1;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: { token: backendJwt(`mint-${minted}`, orgIdOf()) },
        }),
    } as Response);
  });
  return state;
}

function makeSession(): Session {
  return {
    user: { id: "", email: "", name: null, image: null, role: "" },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeToken(sessionId: string | undefined, orgId: string | null = ORG): JWT {
  return {
    id: USER,
    email: "probe@example.test",
    sessionId,
    orgId,
    authProvider: "credentials",
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearBackendJwtStoreForTesting();
});

describe("credentials authorize — the magic-link identity is narrowed, never asserted", () => {
  function replyWith(body: unknown): void {
    postMock.mockResolvedValue({ data: body });
  }

  async function authorize(token = "magic-token"): Promise<unknown> {
    return authorizeMagicToken(token, new Headers());
  }

  it("accepts the enveloped identity and carries the backend's session id", async () => {
    installTransport();
    replyWith({
      success: true,
      data: { userId: USER, orgId: ORG, sessionId: SESSION_A },
    });

    const user = await authorize();

    expect(user).toMatchObject({ id: USER, sessionId: SESSION_A });
  });

  it("accepts an unenveloped identity body", async () => {
    installTransport();
    replyWith({ userId: USER, orgId: ORG, sessionId: SESSION_A });

    await expect(authorize()).resolves.toMatchObject({ sessionId: SESSION_A });
  });

  it("(negative) refuses an empty token without calling the backend", async () => {
    installTransport();
    await expect(authorizeMagicToken("", new Headers())).resolves.toBeNull();
    await expect(authorizeMagicToken(undefined, new Headers())).resolves.toBeNull();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("(negative) refuses a body with no userId, and one whose userId is not a string", async () => {
    installTransport();
    replyWith({ success: true, data: { orgId: ORG, sessionId: SESSION_A } });
    await expect(authorize()).resolves.toBeNull();

    replyWith({ success: true, data: { userId: 42, sessionId: SESSION_A } });
    await expect(authorize()).resolves.toBeNull();

    replyWith({ success: true, data: { userId: "", sessionId: SESSION_A } });
    await expect(authorize()).resolves.toBeNull();
  });

  it("REGRESSION (negative) refuses an identity with no session id at all", async () => {
    // The unchecked cast admitted this. The jwt callback then stamped `~<uuid>`,
    // which `resolveAuthSession` treats as unregistered and skips the exchange
    // for — so the browser held a session that looked signed in and 401ed on
    // every API call. Refusing here turns it into a visible sign-in failure.
    installTransport();
    replyWith({ success: true, data: { userId: USER, orgId: ORG } });

    await expect(authorize()).resolves.toBeNull();
  });

  it("REGRESSION (negative) refuses an identity whose session id is not a string", async () => {
    // A numeric sessionId reached `token.sessionId?.trim()` in the session
    // callback, threw a TypeError inside its try, and fell into the branch that
    // never sets `backendJwt` — the same dead session, arrived at by a crash.
    installTransport();
    replyWith({ success: true, data: { userId: USER, sessionId: 12345 } });

    await expect(authorize()).resolves.toBeNull();
  });

  it("(negative) refuses when the identity call is not 2xx", async () => {
    installTransport();
    postMock.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 401"), {
        response: { status: 401 },
      }),
    );

    await expect(authorize()).resolves.toBeNull();
  });

  it("(negative) refuses when the session data behind a valid identity is unreadable", async () => {
    const transport = installTransport({ sessionDataStatus: 500 });
    replyWith({ success: true, data: { userId: USER, sessionId: SESSION_A } });

    await expect(authorize()).resolves.toBeNull();
    expect(transport.sessionDataCalls).toBeGreaterThan(0);
  });

  it("forwards the caller's user agent and first forwarded-for hop", async () => {
    installTransport();
    replyWith({ success: true, data: { userId: USER, sessionId: SESSION_A } });

    await authorizeMagicToken(
      "magic-token",
      new Headers({
        "user-agent": "Probe/1.0",
        "x-forwarded-for": "203.0.113.5, 10.0.0.1",
      }),
    );

    expect(postMock.mock.calls[0][2]).toMatchObject({
      headers: { "x-client-user-agent": "Probe/1.0", "x-client-ip": "203.0.113.5" },
    });
  });
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

describe("signOut event — the production eviction seam", () => {
  const signOutEvent = authConfig.events.signOut;

  async function seedTwoDevices(): Promise<{ a: string; b: string }> {
    installMintingTransport();
    const a = await resolveAuthSession(makeSession(), makeToken(SESSION_A));
    const b = await resolveAuthSession(makeSession(), makeToken(SESSION_B));
    if (!a.backendJwt || !b.backendJwt) throw new Error("seed failed to mint");
    if (a.backendJwt === b.backendJwt) throw new Error("seed minted one token twice");
    return { a: a.backendJwt, b: b.backendJwt };
  }

  it("revoking the current device drops its token and leaves the other device minting", async () => {
    const { b } = await seedTwoDevices();

    await signOutEvent({ token: makeToken(SESSION_A) });

    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBeNull();
    expect(getBackendJwtFromStore(`${USER}:${SESSION_B}:${ORG}`)).toBe(b);
  });

  it("BITE: with the event removed, the signed-out device's token stays servable", async () => {
    const { a } = await seedTwoDevices();

    // The eviction the event performs, not performed. This is the state the
    // seam existed to prevent for the whole of its test-only life.
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBe(a);

    await signOutEvent({ token: makeToken(SESSION_A) });
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBeNull();
  });

  it("evicts every organization that device session minted for", async () => {
    let activeOrg: string = ORG;
    installMintingTransport(() => activeOrg);
    await resolveAuthSession(makeSession(), makeToken(SESSION_A));
    activeOrg = ORG_OTHER;
    await resolveAuthSession(makeSession(), makeToken(SESSION_A, ORG_OTHER));

    await signOutEvent({ token: makeToken(SESSION_A) });

    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBeNull();
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG_OTHER}`)).toBeNull();
  });

  it("re-exchanges after sign-out, and a backend that now refuses yields no token", async () => {
    await seedTwoDevices();
    await signOutEvent({ token: makeToken(SESSION_A) });

    const transport = installTransport({ exchangeStatus: 401 });
    const session = await resolveAuthSession(makeSession(), makeToken(SESSION_A));

    expect(transport.exchangeCalls).toBe(1);
    expect(session.backendJwt).toBeUndefined();
  });

  it("a fresh login mints under its own key and cannot read the signed-out one", async () => {
    await seedTwoDevices();
    await signOutEvent({ token: makeToken(SESSION_A) });

    const transport = installTransport({ exchangeToken: backendJwt("session-new", ORG) });
    const fresh = await resolveAuthSession(makeSession(), makeToken("session-new"));

    expect(fresh.backendJwt).toBe(backendJwt("session-new", ORG));
    expect(transport.exchangeCalls).toBe(1);
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBeNull();
  });

  it("(negative) is a no-op for a null token, a token with no session id and a database-strategy message", async () => {
    const { a, b } = await seedTwoDevices();

    await signOutEvent({ token: null });
    await signOutEvent({ token: makeToken(undefined) });
    await signOutEvent({ session: undefined });

    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBe(a);
    expect(getBackendJwtFromStore(`${USER}:${SESSION_B}:${ORG}`)).toBe(b);
  });

  it("revoking ANOTHER device is not observable here — retention is bounded, the backend is the authority", async () => {
    const { a } = await seedTwoDevices();

    // Device B asks the backend to revoke device A. Nothing reaches this
    // process, so A's entry survives by design.
    endBackendJwtSession(makeToken(SESSION_B));
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBe(a);

    // The retention is bounded by the token's own expiry, and the next mint for
    // A is refused by the backend rather than served from here.
    const expired = Buffer.from(
      JSON.stringify({ sub: USER, sessionId: SESSION_A, exp: Math.floor(Date.now() / 1000) - 10 }),
    ).toString("base64url");
    clearBackendJwtStoreForTesting();
    const transport = installTransport({
      exchangeStatus: 200,
      exchangeToken: `h.${expired}.sig`,
    });
    const afterExpiry = await resolveAuthSession(makeSession(), makeToken(SESSION_A));
    expect(getBackendJwtFromStore(`${USER}:${SESSION_A}:${ORG}`)).toBeNull();
    expect(afterExpiry.backendJwt).toBe(`h.${expired}.sig`);
    expect(transport.exchangeCalls).toBe(1);

    const refused = installTransport({ exchangeStatus: 401 });
    const next = await resolveAuthSession(makeSession(), makeToken(SESSION_A));
    expect(next.backendJwt).toBeUndefined();
    expect(refused.exchangeCalls).toBe(1);
  });
});
