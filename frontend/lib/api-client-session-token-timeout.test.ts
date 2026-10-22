import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

import { ApiError, apiClient, clearBackendTokenCache, getBackendToken } from "@/lib/api-client";

describe("the session token read has a deadline", () => {
  let sessionCalls = 0;
  let stall = true;

  beforeEach(() => {
    sessionCalls = 0;
    stall = true;
    clearBackendTokenCache();
    jest.spyOn(AbortSignal, "timeout").mockImplementation(() => {
      const controller = new AbortController();
      queueMicrotask(() => controller.abort(new DOMException("timed out", "TimeoutError")));
      return controller.signal;
    });
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (!String(input).includes("/api/auth/session")) throw new Error(`unexpected fetch: ${String(input)}`);
      sessionCalls += 1;
      if (!stall) return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    }) as unknown as typeof fetch;
  });

  afterEach(() => jest.restoreAllMocks());

  it("rejects with a TIMEOUT instead of waiting for ever", async () => {
    await expect(getBackendToken()).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("fails the API call as a timeout, without sending it unauthenticated", async () => {
    const error = await apiClient.get("/hr/leaves").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "TIMEOUT" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("lets the next attempt ask again at once, unlike a session with no token", async () => {
    await expect(getBackendToken()).rejects.toMatchObject({ code: "TIMEOUT" });
    stall = false;

    await expect(getBackendToken()).resolves.toBeNull();
    expect(sessionCalls).toBe(2);
  });
});
