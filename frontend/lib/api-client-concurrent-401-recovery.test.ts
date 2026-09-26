import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

const signOutMock = jest.fn(async (_options?: unknown) => undefined);
jest.mock("next-auth/react", () => ({
  signOut: (options?: unknown) => signOutMock(options),
}));

import { authedFetch, clearBackendTokenCache, getBackendToken } from "@/lib/api-client";
import { registerQueryCacheClearer } from "@/lib/query-cache-control";

function jwtWithExp(marker: string, secondsFromNow: number): string {
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  const payload = Buffer.from(JSON.stringify({ exp, marker })).toString("base64url");
  return `header.${payload}.${marker}`;
}

const FIRST_TOKEN = jwtWithExp("first", 600);
const SECOND_TOKEN = jwtWithExp("second", 600);

let sessionCalls = 0;
let apiCalls: { authorization: string | null }[] = [];
let cacheClears = 0;
let unregister: () => void;

/** Accepts SECOND_TOKEN, 401s everything else — the shape of an expired session. */
function installTransport(): void {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/auth/session")) {
      sessionCalls += 1;
      const backendJwt = sessionCalls === 1 ? FIRST_TOKEN : SECOND_TOKEN;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ backendJwt }) } as Response;
    }
    const headers = new Headers(init?.headers);
    const authorization = headers.get("Authorization");
    apiCalls.push({ authorization });
    const accepted = authorization === `Bearer ${SECOND_TOKEN}`;
    return {
      ok: accepted,
      status: accepted ? 200 : 401,
      statusText: accepted ? "OK" : "Unauthorized",
      clone: () => ({ json: async () => ({}) }),
      json: async () => ({ success: true, data: {} }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  sessionCalls = 0;
  apiCalls = [];
  cacheClears = 0;
  signOutMock.mockClear();
  clearBackendTokenCache();
  unregister = registerQueryCacheClearer(() => {
    cacheClears += 1;
  });
  installTransport();
});

afterEach(() => {
  unregister();
});

async function fireConcurrentReads(count: number): Promise<Response[]> {
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      authedFetch(`http://api.test/thing-${i}`, { method: "GET" }, `/thing-${i}`),
    ),
  );
}

describe("a tab that wakes with an expired token recovers once, not once per in-flight request", () => {
  it("mints one replacement token for twenty simultaneous 401s, instead of twenty that cancel each other", async () => {
    await getBackendToken();
    expect(sessionCalls).toBe(1);

    await fireConcurrentReads(20);

    expect(sessionCalls).toBe(2);
  });

  it("retries every one of the twenty with the replacement token, so none is left failed", async () => {
    const responses = await fireConcurrentReads(20);

    expect(responses.map((r) => r.status)).toEqual(Array.from({ length: 20 }, () => 200));
  });

  it("does not sign the user out when the replacement token is accepted", async () => {
    await fireConcurrentReads(20);

    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("does not wipe the query cache when the replacement token is accepted", async () => {
    await fireConcurrentReads(20);

    expect(cacheClears).toBe(0);
  });

  it("never sends an authenticated request without an Authorization header", async () => {
    await fireConcurrentReads(20);

    expect(apiCalls.every((c) => c.authorization !== null)).toBe(true);
  });
});

describe("a session the server keeps refusing ends exactly once", () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/session")) {
        sessionCalls += 1;
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ backendJwt: jwtWithExp(`gen${sessionCalls}`, 600) }),
        } as Response;
      }
      apiCalls.push({ authorization: null });
      return {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        clone: () => ({ json: async () => ({}) }),
        json: async () => ({ code: "UNAUTHORIZED" }),
      } as unknown as Response;
    }) as unknown as typeof fetch;
  });

  it("clears the query cache once for twenty simultaneous dead requests, not twenty times", async () => {
    await fireConcurrentReads(20);

    expect(cacheClears).toBe(1);
  });

  it("calls signOut once for twenty simultaneous dead requests, not twenty times", async () => {
    await fireConcurrentReads(20);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
