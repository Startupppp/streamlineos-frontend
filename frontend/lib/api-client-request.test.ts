import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

import {
  clearBackendTokenCache,
  request,
} from "@/lib/api-client";

function jwt(marker: string): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600, marker }),
  ).toString("base64url");
  return `header.${payload}.${marker}`;
}

describe("request", () => {
  beforeEach(() => {
    clearBackendTokenCache();
  });

  it("uses the shared token cache and 401 single-flight recovery for raw responses", async () => {
    const first = jwt("first");
    const replacement = jwt("replacement");
    let sessionCalls = 0;
    const authorizations: Array<string | null> = [];

    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/auth/session")) {
        sessionCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            backendJwt: sessionCalls === 1 ? first : replacement,
          }),
        } as Response;
      }

      const authorization = new Headers(init?.headers).get("Authorization");
      authorizations.push(authorization);
      return {
        ok: authorization === `Bearer ${replacement}`,
        status: authorization === `Bearer ${replacement}` ? 200 : 401,
        headers: new Headers({ "content-type": "application/json" }),
        clone: () => ({ json: async () => ({}) }),
        json: async () => ({ token: "stream-token" }),
      } as unknown as Response;
    }) as typeof fetch;

    const responses = await Promise.all(
      Array.from({ length: 12 }, () =>
        request("/notifications/events/token", { method: "POST" }),
      ),
    );

    expect(responses.every((response) => response.ok)).toBe(true);
    expect(sessionCalls).toBe(2);
    expect(authorizations.filter((value) => value === `Bearer ${first}`)).toHaveLength(12);
    expect(authorizations.filter((value) => value === `Bearer ${replacement}`)).toHaveLength(12);
  });

  it("preserves raw response headers for endpoint-specific Retry-After handling", async () => {
    const backendJwt = jwt("active");
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/session")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ backendJwt }),
        } as Response;
      }
      return {
        ok: false,
        status: 429,
        headers: new Headers({ "retry-after": "45" }),
      } as Response;
    }) as typeof fetch;

    const response = await request("/notifications/events/token", {
      method: "POST",
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
  });
});
