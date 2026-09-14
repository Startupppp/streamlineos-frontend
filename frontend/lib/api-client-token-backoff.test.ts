import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

import { clearBackendTokenCache, getBackendToken } from "@/lib/api-client";

const sessionCalls: string[] = [];

function sessionResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as Response;
}

let sessionBody: unknown = {};

beforeEach(() => {
  sessionCalls.length = 0;
  sessionBody = {};
  clearBackendTokenCache();
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/auth/session")) {
      sessionCalls.push(url);
      return sessionResponse(sessionBody);
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

describe("a session that yields no backend token must not be re-asked on every request", () => {
  it("asks once and then backs off, instead of one session fetch per API call", async () => {
    for (let i = 0; i < 20; i += 1) {
      const token = await getBackendToken();
      expect(token).toBeNull();
    }

    expect(sessionCalls).toHaveLength(1);
  });

  it("lets the 401 recovery path retry immediately, because it clears the cache first", async () => {
    expect(await getBackendToken()).toBeNull();
    expect(sessionCalls).toHaveLength(1);

    clearBackendTokenCache();
    expect(await getBackendToken()).toBeNull();

    expect(sessionCalls).toHaveLength(2);
  });

  it("caches a real token so repeated calls cost one session fetch", async () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
    const backendJwt = `header.${payload}.signature`;
    sessionBody = { backendJwt };

    const first = await getBackendToken();
    for (let i = 0; i < 10; i += 1) await getBackendToken();

    expect(first).toBe(backendJwt);
    expect(sessionCalls).toHaveLength(1);
  });
});
