import { readFileSync } from "fs";
import { join } from "path";
import { withCorrelation, withTraceContext, CORRELATION_HEADER, TRACEPARENT_HEADER } from "./with-correlation";

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(async () => ({ backendJwt: "test-jwt" })),
}));

// jsdom ships no AbortSignal.timeout; the wrappers under test all use it.
if (typeof AbortSignal.timeout !== "function") {
  AbortSignal.timeout = ((ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms).unref?.();
    return controller.signal;
  }) as typeof AbortSignal.timeout;
}

type FetchCall = { url: string; init: RequestInit };

function stubFetch(): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    // jsdom has no global Response; the wrappers read only these members.
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ success: true, data: {} }),
    } as Response);
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function headerOf(call: FetchCall | undefined, name: string): string | null {
  if (!call) return null;
  return new Headers(call.init.headers).get(name);
}

describe("withCorrelation", () => {
  it("stamps an id the backend will echo onto every log line for the request", () => {
    const value = withCorrelation(new Headers()).get(CORRELATION_HEADER);
    expect(value).toBeTruthy();
    // The backend strips anything outside [A-Za-z0-9._-] and caps at 64 chars,
    // so an id that does not survive that filter never joins up.
    expect(value).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
  });

  it("keeps an id a caller already set rather than starting a second one", () => {
    const headers = new Headers({ [CORRELATION_HEADER]: "caller-supplied-id" });
    expect(withCorrelation(headers).get(CORRELATION_HEADER)).toBe("caller-supplied-id");
  });

  it("mints a distinct id per request", () => {
    const a = withCorrelation(new Headers()).get(CORRELATION_HEADER);
    const b = withCorrelation(new Headers()).get(CORRELATION_HEADER);
    expect(a).not.toBe(b);
  });

  it("withTraceContext emits a W3C traceparent the backend can parse", () => {
    const headers = new Headers(withTraceContext({}).headers);
    expect(headers.get(TRACEPARENT_HEADER)).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it("withTraceContext keeps the caller's other fetch options", () => {
    const init = withTraceContext({ cache: "no-store", next: { revalidate: 60 } });
    expect(init.cache).toBe("no-store");
    expect((init as { next?: { revalidate?: number } }).next?.revalidate).toBe(60);
  });
});

/**
 * PRD-C102 — "Correlate one user intent through asynchronous work." Every
 * wrapper that reaches the API is a boundary that has to carry the id; four of
 * the five were sending only an Authorization header, so an intent that started
 * in the portal, in a server component, on a public page or on the notification
 * stream could not be joined to the server-side work it caused.
 */
describe("every API wrapper propagates correlation context", () => {
  let fetchStub: ReturnType<typeof stubFetch>;
  beforeEach(() => { fetchStub = stubFetch(); });
  afterEach(() => fetchStub.restore());

  it("portal-api-client sends the correlation header", async () => {
    const { portalApiClient } = await import("@/lib/portal-api-client");
    await portalApiClient.get("/portal/me");
    expect(headerOf(fetchStub.calls[0], CORRELATION_HEADER)).toBeTruthy();
  });

  it("server-fetch sends the correlation header", async () => {
    const { serverGet } = await import("@/lib/server-fetch");
    await serverGet("/me/profile");
    expect(headerOf(fetchStub.calls[0], CORRELATION_HEADER)).toBeTruthy();
  });

  it("public-fetch no-store sends the correlation header", async () => {
    const { publicGetNoStore } = await import("@/lib/public-fetch");
    await publicGetNoStore("/public/kb");
    expect(headerOf(fetchStub.calls[0], CORRELATION_HEADER)).toBeTruthy();
  });

  it("the notification SSE stream sends the correlation header alongside its token", async () => {
    const { consumeNotificationStream } = await import(
      "@/features/notifications/notification-event-stream"
    );
    await expect(
      consumeNotificationStream("/notifications/stream", "tok", new AbortController().signal, () => {}),
    ).rejects.toThrow();
    expect(headerOf(fetchStub.calls[0], CORRELATION_HEADER)).toBeTruthy();
    expect(headerOf(fetchStub.calls[0], "Authorization")).toBe("Bearer tok");
  });

  /**
   * The cached public read is the one wrapper that must NOT carry a freshly
   * minted correlation id: Next builds its data-cache key from the request
   * headers, so a per-call id turns every cached read into a miss. It strips
   * `traceparent` from that key by design, which is why trace context rides
   * there instead — and the backend joins it rather than starting a new trace.
   */
  it("public-fetch cached read carries trace context, not a cache-busting id", async () => {
    const { publicGet } = await import("@/lib/public-fetch");
    await publicGet("/public/kb");
    expect(headerOf(fetchStub.calls[0], TRACEPARENT_HEADER)).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
    );
    expect(headerOf(fetchStub.calls[0], CORRELATION_HEADER)).toBeNull();
  });

  it("the public form read and submit both send the correlation header", async () => {
    const { fetchPublicForm, submitPublicForm } = await import(
      "@/features/build/forms/public-form-api"
    );
    await fetchPublicForm("tok").catch(() => undefined);
    await submitPublicForm("tok", {}).catch(() => undefined);
    expect(fetchStub.calls).toHaveLength(2);
    for (const call of fetchStub.calls)
      expect(headerOf(call, CORRELATION_HEADER)).toBeTruthy();
  });

  it("the public intake submit sends the correlation header", async () => {
    const { submitIntake } = await import("@/features/build/intake/public-intake-api");
    await submitIntake("proj-1", {} as never).catch(() => undefined);
    expect(headerOf(fetchStub.calls[0], CORRELATION_HEADER)).toBeTruthy();
  });
});

/**
 * A scan, because a wrapper added tomorrow is the failure mode a per-call test
 * cannot see. Every fetch in these files reaches our own API; each one is a
 * boundary a user intent crosses, and each has to carry the id or the intent
 * stops being traceable there.
 */
describe("no API-bound fetch in these files is left without correlation context", () => {
  const ROOT = join(__dirname, "..", "..");

  const SCANNED_FILES = [
    "lib/api-client.ts",
    "lib/portal-api-client.ts",
    "lib/server-fetch.ts",
    "lib/public-fetch.ts",
    "lib/auth-session.ts",
    "features/notifications/notification-event-stream.ts",
    "features/notifications/use-notification-events.ts",
    "features/build/forms/public-form-api.ts",
    "features/build/intake/public-intake-api.ts",
    "features/landing/contact-form.tsx",
    "hooks/api/sign/public.ts",
    "app/(public)/wiki/[shareToken]/page.tsx",
    "app/(authenticated)/build/workspaces/[pmWorkspaceId]/layout.tsx",
  ];

  /** The one same-origin call in the list: NextAuth's own session route. */
  const SAME_ORIGIN = /fetch\(\s*"\/api\//;

  /**
   * A call is stamped when its options carry a `withCorrelation(...)` /
   * `withTraceContext(...)` expression, or a bare `headers` identifier holding a
   * Headers the same function already stamped (which is how the retry path in
   * `api-client` reuses one id for both attempts).
   */
  const STAMPED = /withCorrelation\(|withTraceContext\(|\bheaders,|headers: headers\b/;

  function unstampedCalls(source: string): string[] {
    const offenders: string[] = [];
    for (const match of source.matchAll(/\bfetch\(/g)) {
      const window = source.slice(match.index ?? 0, (match.index ?? 0) + 300);
      if (SAME_ORIGIN.test(window)) continue;
      if (!STAMPED.test(window)) offenders.push(window.split("\n")[0] ?? "");
    }
    return offenders;
  }

  it.each(SCANNED_FILES)("%s stamps every backend fetch", (relative) => {
    expect(unstampedCalls(readFileSync(join(ROOT, relative), "utf8"))).toEqual([]);
  });

  it("the scan bites — a wrapper sending only an Authorization header is detected", () => {
    const bad = 'const res = await fetch(url, {\n  headers: { Authorization: `Bearer ${token}` },\n});';
    expect(unstampedCalls(bad)).toHaveLength(1);
  });

  it("the scan ignores the same-origin NextAuth session route", () => {
    const sameOrigin = 'const sessionRes = await fetch("/api/auth/session", { credentials: "include" });';
    expect(unstampedCalls(sameOrigin)).toEqual([]);
  });
});
