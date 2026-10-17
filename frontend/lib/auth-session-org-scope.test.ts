/**
 * @jest-environment node
 *
 * CHAT-008: a session in org "Alpha" reloaded into the account's most-recently-activated org,
 * because session-data was fetched without saying which org THIS session had selected.
 */
jest.mock("@/lib/backend-url", () => ({ BACKEND_URL: "http://backend.test" }));

jest.mock("axios", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock("jose", () => {
  function decodeJwt(token: string): Record<string, unknown> {
    return JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf-8"),
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

import type { JWT } from "next-auth/jwt";
import { authConfig, resolveAuthSession } from "@/lib/auth";
import {
  clearBackendJwtStoreForTesting,
  clearSessionDataStoreForTesting,
} from "@/lib/auth-session";
import {
  ORG,
  ORG_OTHER,
  SESSION_A,
  backendJwt,
  makeSession,
  makeToken,
  sessionDataPayload,
} from "./auth-callbacks-test-helpers";

const ORIGINAL_ENV = process.env;
const LAST_ACTIVATED = ORG;
const ALPHA = ORG_OTHER;

/** The backend: `?orgId=` wins while the user is a member; otherwise the last-activated org. */
function installBackend(): { exchangeBodies: unknown[] } {
  const exchangeBodies: unknown[] = [];
  const fetchMock = jest.fn((url: unknown, init?: RequestInit) => {
    const href = new URL(String(url));
    if (href.pathname.startsWith("/auth/session-data/")) {
      const orgId = href.searchParams.get("orgId") ?? LAST_ACTIVATED;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: sessionDataPayload(orgId) }),
      });
    }
    const body = JSON.parse(String(init?.body)) as { orgId: string | null };
    exchangeBodies.push(body);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: { token: backendJwt(SESSION_A, body.orgId) } }),
    });
  });
  Object.defineProperty(globalThis, "fetch", { value: fetchMock, configurable: true, writable: true });
  return { exchangeBodies };
}

function runJwtUpdate(token: JWT, session: unknown): Promise<JWT | null> {
  return authConfig.callbacks.jwt({
    token,
    user: undefined as never,
    account: null,
    trigger: "update",
    session,
  });
}

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
  clearBackendJwtStoreForTesting();
  clearSessionDataStoreForTesting();
});

describe("a reload keeps the org the session selected", () => {
  it("resolves the session into its own org, not the last-activated one, and mints for it", async () => {
    const backend = installBackend();

    const session = await resolveAuthSession(makeSession(), makeToken(SESSION_A, ALPHA));

    expect(session.orgId).toBe(ALPHA);
    expect(backend.exchangeBodies).toEqual([{ orgId: ALPHA }]);
  });

  it("keeps the session's org across an update that does not name one", async () => {
    installBackend();
    const token = await runJwtUpdate(makeToken(SESSION_A, ALPHA), { name: "Renamed" });
    expect(token?.orgId).toBe(ALPHA);
  });

  it("moves to the org an org switch names", async () => {
    installBackend();
    const token = await runJwtUpdate(makeToken(SESSION_A, LAST_ACTIVATED), { orgId: ALPHA });
    expect(token?.orgId).toBe(ALPHA);
  });
});
