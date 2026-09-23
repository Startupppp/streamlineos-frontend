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
import { authorizeMagicToken } from "@/lib/auth";
import { clearBackendJwtStoreForTesting } from "@/lib/auth-session";
import {
  USER,
  ORG,
  SESSION_A,
  installTransport,
} from "./auth-callbacks-test-helpers";

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

