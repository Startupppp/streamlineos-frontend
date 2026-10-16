import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

import {
  apiClient,
  clearBackendTokenCache,
  isApiError,
  resetOutageCircuit,
} from "@/lib/api-client";
import { isTransientNetworkError } from "@/lib/query-error-policy";

/**
 * SEC-HRMS-003. During an origin outage (Cloudflare 502 without CORS headers
 * surfaces as a fetch TypeError) one tab sent ~60 req/min: every retry layer
 * above the client re-fired on its own clock. The circuit in
 * `fetchOrThrowTransportError` makes those retries fail fast instead.
 */

function jsonResponse(
  status: number,
  body: unknown,
  contentType = "application/json",
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers({ "content-type": contentType }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

let origin: "down" | "up" | Response = "down";
const apiFetch = jest.fn();

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-09-30T10:00:00Z") });
  clearBackendTokenCache();
  resetOutageCircuit();
  origin = "down";
  apiFetch.mockReset();
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes("/api/auth/session")) return jsonResponse(200, {});
    apiFetch();
    if (origin === "down") throw new TypeError("Failed to fetch");
    if (origin === "up") return jsonResponse(200, { ok: true });
    return origin;
  }) as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

function read(): Promise<unknown> {
  return apiClient.get("/me/access").then(
    () => null,
    (thrown: unknown) => thrown,
  );
}

it("sends one request per backoff window during an outage, failing the rest fast", async () => {
  const first = await read();
  expect(isApiError(first) && first.code).toBe("NETWORK_ERROR");

  const failedFast = await Promise.all(Array.from({ length: 20 }, read));
  expect(apiFetch).toHaveBeenCalledTimes(1);
  // Same classification as a real transport failure, so the UI still reads
  // "Server temporarily unavailable".
  for (const error of failedFast) expect(isTransientNetworkError(error)).toBe(true);

  jest.advanceTimersByTime(5_000);
  await read();
  expect(apiFetch).toHaveBeenCalledTimes(2);

  // The window doubled: 5s later is still inside it.
  jest.advanceTimersByTime(5_000);
  await read();
  expect(apiFetch).toHaveBeenCalledTimes(2);
  jest.advanceTimersByTime(5_000);
  await read();
  expect(apiFetch).toHaveBeenCalledTimes(3);
});

it("closes on the first successful response once the origin is back", async () => {
  await read();
  jest.advanceTimersByTime(5_000);
  origin = "up";

  expect(await read()).toBeNull();
  expect(await read()).toBeNull();
  expect(await read()).toBeNull();
  expect(apiFetch).toHaveBeenCalledTimes(4);

  // The backoff reset too: the next outage starts at 5s again, not 10s.
  origin = "down";
  await read();
  jest.advanceTimersByTime(5_000);
  await read();
  expect(apiFetch).toHaveBeenCalledTimes(6);
});

it("opens on a gateway's HTML 502 too", async () => {
  origin = jsonResponse(502, "<html>Bad gateway</html>", "text/html");
  await read();
  await read();
  expect(apiFetch).toHaveBeenCalledTimes(1);
});

it("stays closed for a 503 the backend itself authored, so one degraded feature does not black out the app", async () => {
  origin = jsonResponse(503, { message: "The AI provider is down" });
  await read();
  await read();
  expect(apiFetch).toHaveBeenCalledTimes(2);
});
