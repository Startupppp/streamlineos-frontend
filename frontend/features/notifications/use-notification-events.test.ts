/**
 * One failed token fetch used to kill the live notification stream for the rest of
 * the page's life.
 *
 * `connect()` read `if (!token || controller.signal.aborted) return;` with no
 * `scheduleRetry()`, and `fetchStreamToken` swallows every error into `null` — a
 * 502 from `/api/auth/session`, a network blip, or a rate-limited
 * `POST /notifications/events/token` (that route is behind `RateLimitGuard`) all
 * arrive as `null`. So the single most likely failure was the one failure that was
 * never retried: strictly worse than exhausting MAX_RETRIES, because it needed one
 * failure rather than five, and the only recovery was remounting the component.
 *
 * Compounding it, `retryCount` was reset only when a notification ARRIVED, never
 * when the stream connected — so a connection that stayed quiet (the normal case)
 * carried every earlier failure forward and gave up mid-session.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();
import type { QueryKey } from "@tanstack/react-query";
import {
  clearStreamToken,
  useNotificationEvents,
} from "./use-notification-events";
import { clearBackendTokenCache, clearImpersonation, setImpersonationToken } from "@/lib/api-client";
import { consumeNotificationStream } from "./notification-event-stream";
import type { IncomingNotification } from "./notification-event-stream";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

jest.mock("./notification-event-stream", () => ({
  consumeNotificationStream: jest.fn(),
}));

const invalidateQueries = jest.fn();
const mockPush = jest.fn();
let mockSession: { orgId?: string; user?: { id: string }; sessionId?: string } = { orgId: "org-1", user: { id: "user-1" }, sessionId: "session-1" };
const backendJwt = `header.${Buffer.from(JSON.stringify({ sub: "user-1", orgId: "org-1", sessionId: "session-1", exp: 9_999_999_999 })).toString("base64url")}.signature`;

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession, status: "authenticated" }),
}));
jest.mock("@/lib/org-scoped-storage", () => ({ useOrgStorageScope: () => `authenticated:${mockSession.orgId ?? ""}:${mockSession.user?.id ?? ""}` }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), dismiss: jest.fn() }) }));

const consume = jest.mocked(consumeNotificationStream);

/** Resolves once, then blocks — a connected SSE stream that has yielded nothing. */
function neverEnding(): Promise<void> {
  return new Promise<void>(() => undefined);
}

describe("useNotificationEvents — a single failure must not end the stream", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    mockSession = { orgId: "org-1", user: { id: "user-1" }, sessionId: "session-1" };
    jest.useFakeTimers();
    consume.mockReset();
    fetchMock.mockReset();
    invalidateQueries.mockReset();
    clearBackendTokenCache();
    clearStreamToken();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    act(() => clearImpersonation());
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function sessionOk() {
    return { ok: true, json: async () => ({ backendJwt }) };
  }

  function tokenOk() {
    return { ok: true, json: async () => ({ token: "stream-token" }) };
  }

  it("opens the stream from the real enveloped token response", async () => {
    fetchMock.mockImplementation((input: unknown) => Promise.resolve(
      String(input).includes("/notifications/events/token")
        ? { ok: true, status: 200, headers: new Headers(), json: async () => ({ success: true, data: { token: "stream-token" } }) }
        : sessionOk(),
    ));
    consume.mockImplementation(neverEnding);
    renderHook(() => useNotificationEvents());
    await waitFor(() => expect(consume).toHaveBeenCalledTimes(1));
    expect(consume.mock.calls[0]?.[1]).toBe("stream-token");
  });

  it("does not mint a stream token from an incomplete signed-in identity", async () => {
    mockSession = { orgId: "org-1" };
    fetchMock.mockImplementation((input: unknown) => Promise.resolve(String(input).includes("/notifications/events/token") ? tokenOk() : sessionOk()));
    renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(100);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });

  it("refuses an impersonated identity instead of minting or hydrating notifications", async () => {
    setImpersonationToken("synthetic-impersonation-token", { id: "another-user", name: null, email: "synthetic@invalid.test" });
    renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(100);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });

  it.each([{ token: "" }, { token: 7 }, { token: "valid", injected: "unexpected" }])("never connects from a malformed real token payload %j", async (data) => {
    fetchMock.mockImplementation((input: unknown) => Promise.resolve(String(input).includes("/notifications/events/token")
      ? { ok: true, status: 200, headers: new Headers(), json: async () => ({ success: true, data }) }
      : sessionOk()));
    renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(100);
    expect(consume).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/notifications/events/token"))).toBe(true);
  });

  it("retries after a token fetch that returns null", async () => {
    // First round: the session endpoint fails, so fetchStreamToken returns null.
    // Second round: everything works.
    fetchMock
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValue(sessionOk());
    consume.mockImplementation(neverEnding);

    renderHook(() => useNotificationEvents());

    // The failed round must have armed a retry timer. Without one, nothing is
    // pending and the stream is dead until the component remounts.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(jest.getTimerCount()).toBeGreaterThan(0));
  });

  it("resets the backoff when the stream connects, not when it first yields", async () => {
    fetchMock.mockImplementation((input: unknown) =>
      Promise.resolve(String(input).includes("/notifications/events/token") ? tokenOk() : sessionOk()),
    );

    let opened = 0;
    consume.mockImplementation((_url, _token, _signal, _onNotification, handlers) => {
      handlers?.onOpen?.();
      opened += 1;
      return neverEnding();
    });

    renderHook(() => useNotificationEvents());

    await waitFor(() => expect(opened).toBe(1));
    // The reset signal is the point: a quiet but healthy connection must clear the
    // failure count, or five quiet reconnects over a day exhaust the budget.
    expect(consume.mock.calls[0]).toHaveLength(5);
    expect(typeof consume.mock.calls[0]?.[4]?.onOpen).toBe("function");
  });

  it("keeps retrying past MAX_RETRIES — the ceiling is on the delay, not the attempts", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    consume.mockImplementation(neverEnding);

    renderHook(() => useNotificationEvents());

    for (let round = 0; round < 8; round++) {
      await waitFor(() => expect(jest.getTimerCount()).toBeGreaterThan(0));
      await jest.advanceTimersByTimeAsync(5 * 60_000);
    }

    // Eight consecutive failures. The head form stopped scheduling after five.
    expect(fetchMock.mock.calls.length).toBeGreaterThan(5);
    // And it is still armed, rather than having quietly given up.
    await waitFor(() => expect(jest.getTimerCount()).toBeGreaterThan(0));
  });
});

/**
 * SEC-HRMS-005. `POST /notifications/events/token` is limited to 30/min per
 * user and returned 429s: `onOpen` zeroed the backoff the instant a stream
 * connected, so a stream that opened and then dropped reconnected (and minted
 * a token) every ~1s forever; and a 429's Retry-After is not CORS-exposed, so
 * the rate-limited branch waited nothing extra.
 */
describe("useNotificationEvents — the token endpoint is never hammered", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0);
    consume.mockReset();
    fetchMock.mockReset();
    clearBackendTokenCache();
    clearStreamToken();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    clearStreamToken();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const isTokenCall = (call: unknown[]) =>
    String(call[0]).includes("/notifications/events/token");
  const tokenCalls = () => fetchMock.mock.calls.filter(isTokenCall).length;

  function tokenEndpoint(response: () => unknown) {
    fetchMock.mockImplementation((input: unknown) =>
      Promise.resolve(
        String(input).includes("/notifications/events/token")
          ? response()
          : { ok: true, json: async () => ({ backendJwt }) },
      ),
    );
  }

  const tokenOk = () => ({ ok: true, json: async () => ({ token: "stream-token" }) });

  it("keeps backing off a stream that opens and then drops straight away", async () => {
    tokenEndpoint(tokenOk);
    consume.mockImplementation(async (_url, _token, _signal, _onNotification, handlers) => {
      handlers?.onOpen?.();
    });

    renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(20_000);

    // 1s, 2s, 4s, 8s: at most five opens in 20s. Resetting on open made it ~20.
    expect(consume.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("resets the backoff once a stream has stayed up, so the next drop reconnects promptly", async () => {
    tokenEndpoint(tokenOk);
    let opens = 0;
    consume.mockImplementation((_url, _token, _signal, _onNotification, handlers) => {
      handlers?.onOpen?.();
      opens += 1;
      // Four quick drops build the backoff up; the fifth stream stays up 31s.
      const lifetime = opens === 5 ? 31_000 : 0;
      return new Promise<void>((resolve) => setTimeout(resolve, lifetime));
    });

    renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(15_000 + 31_000);
    expect(opens).toBe(5);

    await jest.advanceTimersByTimeAsync(1_500);
    expect(opens).toBe(6);
  });

  it("waits a minute after a 429 whose Retry-After the browser cannot read", async () => {
    tokenEndpoint(() => ({ ok: false, status: 429, headers: new Headers(), json: async () => ({}) }));
    consume.mockImplementation(neverEnding);

    renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(59_000);
    expect(tokenCalls()).toBe(1);

    await jest.advanceTimersByTimeAsync(2_000);
    expect(tokenCalls()).toBe(2);
  });
});

describe("useNotificationEvents — a live notification refreshes every surface it lands on", () => {
  const fetchMock = jest.fn();

  const arriving: IncomingNotification = {
    id: 1,
  };

  beforeEach(() => {
    consume.mockReset();
    fetchMock.mockReset();
    invalidateQueries.mockReset();
    clearBackendTokenCache();
    clearStreamToken();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockImplementation((input: unknown) =>
      Promise.resolve(
        String(input).includes("/notifications/events/token")
          ? { ok: true, json: async () => ({ token: "stream-token" }) }
          : { ok: true, json: async () => ({ backendJwt }) },
      ),
    );
  });

  function invalidatedKeys(): string[] {
    return invalidateQueries.mock.calls.map((call) => {
      const filters: unknown = call[0];
      const key =
        typeof filters === "object" && filters !== null && "queryKey" in filters
          ? (filters as { queryKey?: QueryKey }).queryKey
          : undefined;
      return JSON.stringify(key);
    });
  }

  it("invalidates the unified inbox and the notification lists, not just the bell", async () => {
    let emit: ((notification: IncomingNotification) => void) | undefined;
    consume.mockImplementation((_url, _token, _signal, onNotification) => {
      emit = onNotification;
      return new Promise<void>(() => undefined);
    });

    renderHook(() => useNotificationEvents());
    await waitFor(() => expect(emit).toBeDefined());

    act(() => emit?.(arriving));
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalled());

    const keys = invalidatedKeys();
    expect(keys).toContain(JSON.stringify(queryKeys.inbox.all));
    expect(keys).toContain(JSON.stringify(queryKeys.notifications.lists()));
    expect(keys).toContain(JSON.stringify(queryKeys.notifications.unreadCount()));
  });
});

describe("notification toast content and action ownership", () => {
  const fetchMock = jest.fn();
  const toastMock = jest.mocked(toast);
  let emit: ((notification: IncomingNotification) => void) | undefined;
  const stored = { id: 7, orgId: "org-1", userId: "user-1", type: "INFO", priority: "NORMAL", category: "PROJECTS", sourceModule: "build", title: "Authorized assignment", message: "Authorized details", link: "/projects/54/tickets/357", isRead: false, pinned: false, channel: "IN_APP", archivedAt: null, snoozedUntil: null, createdAt: "2026-10-03T00:00:00Z", ticketContext: null };
  beforeEach(() => {
    clearStreamToken(); clearBackendTokenCache(); consume.mockReset(); fetchMock.mockReset(); toastMock.mockReset(); mockPush.mockReset();
    mockSession = { orgId: "org-1", user: { id: "user-1" }, sessionId: "session-1" };
    toastMock.mockReturnValue("owned-toast");
    global.fetch = fetchMock;
    fetchMock.mockImplementation((input: unknown) => Promise.resolve({ ok: true, status: 200, headers: new Headers(), json: async () => String(input).includes("/notifications/events/token")
      ? { success: true, data: { token: "stream-token" } }
      : String(input).includes("/notifications?") ? { success: true, data: { data: [stored], hasMore: false, nextCursor: null } }
      : { backendJwt: `header.${Buffer.from(JSON.stringify({ sub: mockSession.user?.id, orgId: mockSession.orgId, sessionId: mockSession.sessionId, exp: 9_999_999_999 })).toString("base64url")}.signature` } }));
    consume.mockImplementation((_url, _token, _signal, callback) => { emit = callback; return neverEnding(); });
  });
  afterEach(() => { clearStreamToken(); emit = undefined; jest.useRealTimers(); });

  it("wakes accepted hints after their timer fires during a same-owner remount gap", async () => {
    jest.useFakeTimers();
    const first = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(emit).toBeDefined());
    act(() => emit?.({ id: 7 }));
    first.unmount();
    await jest.advanceTimersByTimeAsync(100);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/notifications?")).length).toBe(0);
    expect(toastMock).not.toHaveBeenCalled();
    const next = renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(100);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/notifications?")).length).toBe(1);
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledTimes(1);
    next.unmount();
  });

  it("reconnects a closed stream whose retry fired during a same-owner remount gap", async () => {
    jest.useFakeTimers();
    let finishStream: () => void = () => { throw new Error("Stream not started"); };
    consume.mockImplementationOnce(() => new Promise((resolve) => { finishStream = resolve; })).mockImplementation(neverEnding);
    const first = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(consume).toHaveBeenCalledTimes(1));
    first.unmount(); finishStream();
    await jest.advanceTimersByTimeAsync(1_500);
    expect(consume).toHaveBeenCalledTimes(1);
    const next = renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(0);
    expect(consume).toHaveBeenCalledTimes(2);
    expect(toastMock).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/notifications?")).length).toBe(0);
    next.unmount();
  });

  it("keeps a future retry delay when the same owner remounts before it expires", async () => {
    jest.useFakeTimers();
    let finishStream: () => void = () => { throw new Error("Stream not started"); };
    consume.mockImplementationOnce(() => new Promise((resolve) => { finishStream = resolve; })).mockImplementation(neverEnding);
    const first = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(consume).toHaveBeenCalledTimes(1));
    first.unmount(); finishStream();
    await jest.advanceTimersByTimeAsync(100);
    const next = renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(800);
    expect(consume).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/notifications/events/token")).length).toBe(1);
    await jest.advanceTimersByTimeAsync(600);
    expect(consume).toHaveBeenCalledTimes(2);
    next.unmount();
  });

  it("discards response content during grace and rehydrates its accepted IDs freshly on remount", async () => {
    jest.useFakeTimers();
    let finishRead: (value: unknown) => void = () => { throw new Error("Read not started"); };
    const original = fetchMock.getMockImplementation();
    let listReads = 0;
    fetchMock.mockImplementation((input: unknown) => {
      if (String(input).includes("/notifications?")) {
        listReads += 1;
        if (listReads === 1) return new Promise((resolve) => { finishRead = resolve; });
      }
      if (!original) throw new Error("Missing request fixture");
      return original(input);
    });
    const first = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(emit).toBeDefined());
    act(() => emit?.({ id: 7 }));
    await jest.advanceTimersByTimeAsync(100);
    expect(listReads).toBe(1);
    first.unmount();
    finishRead({ ok: true, status: 200, headers: new Headers(), json: async () => ({ success: true, data: { data: [{ ...stored, title: "Disposed response text" }], hasMore: false, nextCursor: null } }) });
    await jest.advanceTimersByTimeAsync(100);
    expect(toastMock).not.toHaveBeenCalled();
    const next = renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(100);
    expect(listReads).toBe(2);
    expect(toastMock).toHaveBeenCalledWith("Authorized assignment", expect.anything());
    expect(toastMock).toHaveBeenCalledTimes(1);
    next.unmount();
  });

  it("does not resume retained old-session hints into a new session after a subscriber gap", async () => {
    jest.useFakeTimers();
    let finishRead: (value: unknown) => void = () => { throw new Error("Read not started"); };
    const original = fetchMock.getMockImplementation();
    let listReads = 0;
    fetchMock.mockImplementation((input: unknown) => {
      if (String(input).includes("/notifications?")) {
        listReads += 1;
        if (listReads === 1) return new Promise((resolve) => { finishRead = resolve; });
      }
      if (!original) throw new Error("Missing request fixture");
      return original(input);
    });
    const first = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(emit).toBeDefined());
    act(() => emit?.({ id: 7 }));
    await jest.advanceTimersByTimeAsync(100);
    first.unmount();
    finishRead({ ok: true, status: 200, headers: new Headers(), json: async () => ({ success: true, data: { data: [{ ...stored, title: "Old session text" }], hasMore: false, nextCursor: null } }) });
    await jest.advanceTimersByTimeAsync(100);
    mockSession = { ...mockSession, sessionId: "session-2" };
    const next = renderHook(() => useNotificationEvents());
    await jest.advanceTimersByTimeAsync(100);
    expect(consume).toHaveBeenCalledTimes(2);
    expect(listReads).toBe(1);
    expect(toastMock).not.toHaveBeenCalled();
    act(() => emit?.({ id: 7 }));
    await jest.advanceTimersByTimeAsync(100);
    expect(listReads).toBe(2);
    expect(toastMock).toHaveBeenCalledWith("Authorized assignment", expect.anything());
    next.unmount();
  });

  it("loads canonical toast content from an authenticated ID read instead of trusting the streamed text", async () => {
    renderHook(() => useNotificationEvents());
    await waitFor(() => expect(emit).toBeDefined());
    const legacy = { id: 7, title: "Forged title", message: "Forged details", link: "/secret", priority: "CRITICAL" };
    act(() => emit?.(legacy));
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock).toHaveBeenCalledWith("Authorized assignment", expect.objectContaining({ description: "Authorized details" }));
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/notifications?")).length).toBe(1);
  });

  it("allows an authorized View action then refuses and dismisses that toast after the session changes", async () => {
    const { rerender } = renderHook(() => useNotificationEvents());
    await waitFor(() => expect(emit).toBeDefined());
    act(() => emit?.({ id: 7 }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    const action = toastMock.mock.calls[0]?.[1]?.action;
    if (typeof action !== "object" || action === null || !("onClick" in action) || typeof action.onClick !== "function") throw new Error("Missing authorized View action");
    Reflect.apply(action.onClick, undefined, []);
    expect(mockPush).toHaveBeenCalledWith("/build/54/tickets/357");
    act(() => { mockSession = { ...mockSession, sessionId: "session-2" }; rerender(); });
    Reflect.apply(action.onClick, undefined, []);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(toast.dismiss).toHaveBeenCalledWith("owned-toast");
  });
});
