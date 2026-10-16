import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();
process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { outageCircuitRemainingMs, resetOutageCircuit } from "@/lib/api-outage-circuit";
import { retryDelayPastOutageCircuit } from "./query-provider";

describe("retryDelayPastOutageCircuit", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2026-10-13T10:00:00Z") });
    clearBackendTokenCache();
    resetOutageCircuit();
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/session"))
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({}) } as Response;
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    resetOutageCircuit();
    jest.useRealTimers();
  });

  it("uses the normal backoff while the circuit is closed", () => {
    expect(retryDelayPastOutageCircuit(0, new Error("x"))).toBe(1_000);
  });

  it("holds a retry until the outage circuit a network failure opened has closed", async () => {
    const error = await apiClient.get("/auth/sessions").catch((e: unknown) => e);
    const open = outageCircuitRemainingMs();
    expect(open).toBeGreaterThan(1_000);
    expect(retryDelayPastOutageCircuit(0, error)).toBeGreaterThanOrEqual(open);
  });
});
