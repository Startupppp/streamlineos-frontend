"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
  getApiErrorCode: () => undefined,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/observability/error-reporter", () => ({ reportError: jest.fn() }));

const mockedGet = apiClient.get as jest.Mock;

function makeWrapper(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

function freshClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function pollPage(overrides: Partial<{
  messages: unknown[];
  nextCursor: number | null;
  hasMore: boolean;
  latestPosition: number | null;
}> = {}) {
  return {
    messages: [],
    nextCursor: null,
    hasMore: false,
    latestPosition: null,
    ...overrides,
  };
}

function message(id: number) {
  return { id, channelId: 1, content: `m${id}` };
}

function pollParams(): Array<Record<string, unknown> | undefined> {
  return mockedGet.mock.calls
    .filter((call) => String(call[0]).endsWith("/messages/poll"))
    .map((call) => call[1] as Record<string, unknown> | undefined);
}

const SERVER_NEWEST = "2026-01-01T10:00:00.000Z";

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue(pollPage());
});

async function renderReconciliation(options: {
  newestLoadedAt?: string | null;
  isRealtimeConnected?: boolean;
  isHistoryLoading?: boolean;
  refetchHistory?: () => Promise<{ isError: boolean }>;
  channelId?: number;
}) {
  const { useChatPollReconciliation } = await import(
    "@/features/chat/use-chat-poll-reconciliation"
  );
  const refetchHistory =
    options.refetchHistory ?? jest.fn().mockResolvedValue({ isError: false });
  const view = renderHook(
    () =>
      useChatPollReconciliation({
        channelId: options.channelId ?? 1,
        newestLoadedAt: options.newestLoadedAt ?? null,
        isRealtimeConnected: options.isRealtimeConnected ?? false,
        isHistoryLoading: options.isHistoryLoading ?? false,
        refetchHistory,
      }),
    { wrapper: makeWrapper(freshClient()) },
  );
  return { ...view, refetchHistory };
}

describe("chat poll reconciliation — server positions, not the browser clock", () => {
  it("opens the sequence at the newest SERVER message time", async () => {
    const { result } = await renderReconciliation({ newestLoadedAt: SERVER_NEWEST });

    await waitFor(() => expect(pollParams().length).toBeGreaterThan(0));
    expect(pollParams()[0]).toEqual({ since: SERVER_NEWEST });
    expect(result.current.position).toEqual({ kind: "since", since: SERVER_NEWEST });
  });

  it("a channel with no loaded history opens at the epoch, never at `now`", async () => {
    await renderReconciliation({ newestLoadedAt: null });

    await waitFor(() => expect(pollParams().length).toBeGreaterThan(0));
    expect(pollParams()[0]).toEqual({ since: "1970-01-01T00:00:00.000Z" });
  });

  it("advances to the server channelPosition after a successful history refetch", async () => {
    mockedGet
      .mockResolvedValueOnce(
        pollPage({ messages: [message(1)], nextCursor: null, latestPosition: 77 }),
      )
      .mockResolvedValue(pollPage());

    const { result, refetchHistory } = await renderReconciliation({
      newestLoadedAt: SERVER_NEWEST,
    });

    await waitFor(() =>
      expect(result.current.position).toEqual({ kind: "cursor", cursor: 77 }),
    );
    expect(refetchHistory).toHaveBeenCalled();
    await waitFor(() => expect(pollParams()).toContainEqual({ cursor: 77 }));
    expect(pollParams().some((p) => p !== undefined && "since" in p && p.since !== SERVER_NEWEST)).toBe(false);
  });

  it("a FAILED history refetch leaves the position exactly where it was", async () => {
    mockedGet.mockResolvedValue(
      pollPage({ messages: [message(1)], nextCursor: null, latestPosition: 77 }),
    );
    const refetchHistory = jest.fn().mockResolvedValue({ isError: true });

    const { result } = await renderReconciliation({
      newestLoadedAt: SERVER_NEWEST,
      refetchHistory,
    });

    await waitFor(() => expect(refetchHistory).toHaveBeenCalled());
    expect(result.current.position).toEqual({ kind: "since", since: SERVER_NEWEST });
    expect(pollParams().every((p) => p !== undefined && "since" in p)).toBe(true);
  });

  it("follows nextCursor across more than one catch-up page", async () => {
    mockedGet
      .mockResolvedValueOnce(
        pollPage({ messages: [message(1)], nextCursor: 10, hasMore: true, latestPosition: 10 }),
      )
      .mockResolvedValueOnce(
        pollPage({ messages: [message(2)], nextCursor: 20, hasMore: true, latestPosition: 20 }),
      )
      .mockResolvedValue(pollPage());

    const { result } = await renderReconciliation({ newestLoadedAt: SERVER_NEWEST });

    await waitFor(() =>
      expect(result.current.position).toEqual({ kind: "cursor", cursor: 20 }),
    );
    expect(pollParams()).toEqual([
      { since: SERVER_NEWEST },
      { cursor: 10 },
      { cursor: 20 },
    ]);
  });

  it("does not poll at all while realtime is healthy", async () => {
    await renderReconciliation({
      newestLoadedAt: SERVER_NEWEST,
      isRealtimeConnected: true,
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(pollParams()).toHaveLength(0);
  });

  it("does not poll until history has answered — there is no position yet", async () => {
    await renderReconciliation({
      newestLoadedAt: null,
      isHistoryLoading: true,
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(pollParams()).toHaveLength(0);
  });

  it("switching channel resets the position back to an opening timestamp", async () => {
    mockedGet
      .mockResolvedValueOnce(
        pollPage({ messages: [message(1)], nextCursor: null, latestPosition: 77 }),
      )
      .mockResolvedValue(pollPage());

    const { useChatPollReconciliation } = await import(
      "@/features/chat/use-chat-poll-reconciliation"
    );
    const refetchHistory = jest.fn().mockResolvedValue({ isError: false });
    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: number }) =>
        useChatPollReconciliation({
          channelId,
          newestLoadedAt: SERVER_NEWEST,
          isRealtimeConnected: false,
          isHistoryLoading: false,
          refetchHistory,
        }),
      { wrapper: makeWrapper(freshClient()), initialProps: { channelId: 1 } },
    );

    await waitFor(() =>
      expect(result.current.position).toEqual({ kind: "cursor", cursor: 77 }),
    );

    rerender({ channelId: 2 });
    expect(result.current.position).toEqual({ kind: "since", since: SERVER_NEWEST });
  });
});

describe("chat poll reconciliation — the bounded offline sweep", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sweeps history while realtime is down even when nothing new arrives", async () => {
    const { useChatPollReconciliation, OFFLINE_HISTORY_RECONCILE_INTERVAL_MS } =
      await import("@/features/chat/use-chat-poll-reconciliation");
    const refetchHistory = jest.fn().mockResolvedValue({ isError: false });

    renderHook(
      () =>
        useChatPollReconciliation({
          channelId: 1,
          newestLoadedAt: SERVER_NEWEST,
          isRealtimeConnected: false,
          isHistoryLoading: false,
          refetchHistory,
        }),
      { wrapper: makeWrapper(freshClient()) },
    );

    expect(refetchHistory).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(OFFLINE_HISTORY_RECONCILE_INTERVAL_MS);
    });
    expect(refetchHistory).toHaveBeenCalled();
  });

  it("stops sweeping the moment realtime supplies the same data", async () => {
    const { useChatPollReconciliation, OFFLINE_HISTORY_RECONCILE_INTERVAL_MS } =
      await import("@/features/chat/use-chat-poll-reconciliation");
    const refetchHistory = jest.fn().mockResolvedValue({ isError: false });

    const { rerender } = renderHook(
      ({ connected }: { connected: boolean }) =>
        useChatPollReconciliation({
          channelId: 1,
          newestLoadedAt: SERVER_NEWEST,
          isRealtimeConnected: connected,
          isHistoryLoading: false,
          refetchHistory,
        }),
      {
        wrapper: makeWrapper(freshClient()),
        initialProps: { connected: false },
      },
    );

    rerender({ connected: true });
    const pollsAtReconnect = pollParams().length;

    await act(async () => {
      jest.advanceTimersByTime(OFFLINE_HISTORY_RECONCILE_INTERVAL_MS * 3);
    });
    expect(refetchHistory).not.toHaveBeenCalled();
    expect(pollParams()).toHaveLength(pollsAtReconnect);
  });
});
