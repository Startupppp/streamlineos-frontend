/**
 * @jest-environment node
 *
 * Drives the signOut event seam in `lib/auth.ts` — not a reimplementation of it.
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

import { authConfig, resolveAuthSession, endBackendJwtSession } from "@/lib/auth";
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
} from "./auth-callbacks-test-helpers";

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
