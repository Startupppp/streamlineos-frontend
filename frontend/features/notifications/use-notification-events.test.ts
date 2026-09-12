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
import type { QueryKey } from "@tanstack/react-query";
import { useNotificationEvents } from "./use-notification-events";
import { consumeNotificationStream } from "./notification-event-stream";
import type { IncomingNotification } from "./notification-event-stream";
import { queryKeys } from "@/lib/query-keys";

jest.mock("./notification-event-stream", () => ({
  consumeNotificationStream: jest.fn(),
}));

const invalidateQueries = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1" }, status: "authenticated" }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));

const consume = jest.mocked(consumeNotificationStream);

/** Resolves once, then blocks — a connected SSE stream that has yielded nothing. */
function neverEnding(): Promise<void> {
  return new Promise<void>(() => undefined);
}

describe("useNotificationEvents — a single failure must not end the stream", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    consume.mockReset();
    fetchMock.mockReset();
    invalidateQueries.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function sessionOk() {
    return { ok: true, json: async () => ({ backendJwt: "jwt-1" }) };
  }

  function tokenOk() {
    return { ok: true, json: async () => ({ token: "stream-token" }) };
  }

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
    await Promise.resolve();
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });

  it("resets the backoff when the stream connects, not when it first yields", async () => {
    fetchMock.mockImplementation((input: unknown) =>
      Promise.resolve(String(input).includes("/notifications/events/token") ? tokenOk() : sessionOk()),
    );

    let opened = 0;
    consume.mockImplementation((_url, _token, _signal, _onNotification, onOpen) => {
      onOpen?.();
      opened += 1;
      return neverEnding();
    });

    renderHook(() => useNotificationEvents());

    await waitFor(() => expect(opened).toBe(1));
    // The reset signal is the point: a quiet but healthy connection must clear the
    // failure count, or five quiet reconnects over a day exhaust the budget.
    expect(consume.mock.calls[0]).toHaveLength(5);
    expect(typeof consume.mock.calls[0]?.[4]).toBe("function");
  });

  it("keeps retrying past MAX_RETRIES — the ceiling is on the delay, not the attempts", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    consume.mockImplementation(neverEnding);

    renderHook(() => useNotificationEvents());

    for (let round = 0; round < 8; round++) {
      await waitFor(() => expect(jest.getTimerCount()).toBeGreaterThan(0));
      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
    }

    // Eight consecutive failures. The head form stopped scheduling after five.
    expect(fetchMock.mock.calls.length).toBeGreaterThan(5);
    // And it is still armed, rather than having quietly given up.
    await waitFor(() => expect(jest.getTimerCount()).toBeGreaterThan(0));
  });
});

describe("useNotificationEvents — a live notification refreshes every surface it lands on", () => {
  const fetchMock = jest.fn();

  const arriving: IncomingNotification = {
    id: 1,
    title: "Deploy finished",
    message: "main is live",
    priority: "NORMAL",
    category: "SYSTEM",
    link: null,
  };

  beforeEach(() => {
    consume.mockReset();
    fetchMock.mockReset();
    invalidateQueries.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockImplementation((input: unknown) =>
      Promise.resolve(
        String(input).includes("/notifications/events/token")
          ? { ok: true, json: async () => ({ token: "stream-token" }) }
          : { ok: true, json: async () => ({ backendJwt: "jwt-1" }) },
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

    const keys = invalidatedKeys();
    expect(keys).toContain(JSON.stringify(queryKeys.inbox.all));
    expect(keys).toContain(JSON.stringify(queryKeys.notifications.lists()));
    expect(keys).toContain(JSON.stringify(queryKeys.notifications.unreadCount()));
  });
});
