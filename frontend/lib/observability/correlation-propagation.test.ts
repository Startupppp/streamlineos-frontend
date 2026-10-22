import { readFileSync } from "fs";
import { join } from "path";
import { withCorrelation, withTraceContext, CORRELATION_HEADER, TRACEPARENT_HEADER } from "./with-correlation";

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(async () => ({ backendJwt: "test-jwt" })),
}));

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
      "@/hooks/api/build/public-form"
    );
    await fetchPublicForm("tok").catch(() => undefined);
    await submitPublicForm("tok", {}).catch(() => undefined);
    expect(fetchStub.calls).toHaveLength(2);
    for (const call of fetchStub.calls)
      expect(headerOf(call, CORRELATION_HEADER)).toBeTruthy();
  });

  it("the public intake submit sends the correlation header", async () => {
    const { submitIntakeByToken } = await import("@/features/build/intake/public-intake-api");
    await submitIntakeByToken("tok-abc", {} as never).catch(() => undefined);
    expect(headerOf(fetchStub.calls[0], CORRELATION_HEADER)).toBeTruthy();
  });
});

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
    "hooks/api/build/public-form.ts",
    "features/build/intake/public-intake-api.ts",
    "features/landing/contact-form.tsx",
    "hooks/api/sign/public.ts",
    "app/(public)/wiki/[shareToken]/page.tsx",
    "app/(authenticated)/build/[projectId]/layout.tsx",
  ];

  const SAME_ORIGIN = /fetch\(\s*"\/api\//;

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
