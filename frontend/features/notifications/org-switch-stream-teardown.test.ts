import { renderHook, act, waitFor } from "@testing-library/react";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
installAbortSignalPolyfill();
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { clearStreamToken, useNotificationEvents } from "./use-notification-events";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope, scopedQueryKeyHashFn } from "@/lib/query-scope";
import type { UnifiedInboxResponse } from "@/types/inbox";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

const mockConsumeStream = jest.fn();

jest.mock("./notification-event-stream", () => ({
  consumeNotificationStream: (
    url: string,
    token: string,
    signal: AbortSignal,
    onNotification: () => void,
  ) => mockConsumeStream(url, token, signal, onNotification),
}));

const mockUseSession = jest.fn();
jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));
jest.mock("@/lib/org-scoped-storage", () => ({ useOrgStorageScope: () => `authenticated:${mockUseSession().data?.orgId ?? ""}:${mockUseSession().data?.user?.id ?? ""}` }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

/**
 * Bite-prove: if `orgId` is removed from the useEffect dependency array in
 * use-notification-events.ts, the cleanup never runs on org switch, the first
 * signal stays unaborted, and the assertion `firstSignal.aborted === true` fails.
 */
describe("useNotificationEvents org-switch stream teardown", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    clearStreamToken();
    savedFetch = global.fetch;

    let tokenSeq = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/auth/session")) {
        return Promise.resolve({
          ok: true,
          json: () => {
            const data = mockUseSession().data;
            const backendJwt = `header.${Buffer.from(JSON.stringify({ sub: data?.user?.id, orgId: data?.orgId, sessionId: data?.sessionId, exp: 9_999_999_999 })).toString("base64url")}.signature`;
            return Promise.resolve({ backendJwt });
          },
        });
      }
      tokenSeq += 1;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: `stream-token-${tokenSeq}` }),
      });
    }) as typeof global.fetch;

    mockConsumeStream.mockImplementation(
      (_url: string, _token: string, signal: AbortSignal) =>
        new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve());
        }),
    );

    mockUseSession.mockReturnValue({
      data: { orgId: "org-alpha", user: { id: "user-1" }, sessionId: "session-1" },
      status: "authenticated",
    });
  });

  afterEach(() => {
    clearStreamToken();
    global.fetch = savedFetch;
    mockConsumeStream.mockClear();
    mockUseSession.mockClear();
  });

  it("aborts the org-alpha stream when switching to org-beta and opens a new one", async () => {
    const { rerender } = renderHook(() => useNotificationEvents(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(mockConsumeStream).toHaveBeenCalledTimes(1);
    });

    const firstSignal = (mockConsumeStream.mock.calls[0] as [string, string, AbortSignal])[2];
    expect(firstSignal.aborted).toBe(false);

    act(() => {
      mockUseSession.mockReturnValue({
        data: { orgId: "org-beta", user: { id: "user-1" }, sessionId: "session-1" },
        status: "authenticated",
      });
      rerender();
    });

    await waitFor(() => {
      expect(firstSignal.aborted).toBe(true);
    });

    await waitFor(() => {
      expect(mockConsumeStream).toHaveBeenCalledTimes(2);
    });

    const secondSignal = (mockConsumeStream.mock.calls[1] as [string, string, AbortSignal])[2];
    expect(secondSignal).not.toBe(firstSignal);
    expect(secondSignal.aborted).toBe(false);
  });

  it("releases the reconnect-on-online listener it registered, so the aborted stream cannot be revived", async () => {
    const added: string[] = [];
    const removed: string[] = [];
    const realAdd = window.addEventListener.bind(window);
    const realRemove = window.removeEventListener.bind(window);
    const addSpy = jest
      .spyOn(window, "addEventListener")
      .mockImplementation((type, listener, options) => {
        if (type === "online") added.push(type);
        realAdd(type, listener, options);
      });
    const removeSpy = jest
      .spyOn(window, "removeEventListener")
      .mockImplementation((type, listener, options) => {
        if (type === "online") removed.push(type);
        realRemove(type, listener, options);
      });

    try {
      const { unmount } = renderHook(() => useNotificationEvents(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(added.length).toBeGreaterThan(0));

      unmount();
      clearStreamToken();

      await waitFor(() => expect(removed.length).toBe(added.length));
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });

  it.each([
    { user: { id: "user-2" }, sessionId: "session-1" },
    { user: { id: "user-1" }, sessionId: "session-2" },
  ])("aborts the old stream on a same-org identity change %j", async (next) => {
    const { rerender } = renderHook(() => useNotificationEvents(), { wrapper: makeWrapper() });
    await waitFor(() => expect(mockConsumeStream).toHaveBeenCalledTimes(1));
    const signal: unknown = mockConsumeStream.mock.calls[0]?.[2];
    if (!(signal instanceof AbortSignal)) throw new Error("Missing stream signal");
    act(() => { mockUseSession.mockReturnValue({ data: { orgId: "org-alpha", ...next }, status: "authenticated" }); rerender(); });
    expect(signal.aborted).toBe(true);
    await waitFor(() => expect(mockConsumeStream).toHaveBeenCalledTimes(2));
    expect(mockConsumeStream.mock.calls[1]?.[2]).not.toBe(signal);
  });
});

describe("unified inbox cache does not survive an org switch", () => {
  const USER = "user-1";
  const UNIFIED_KEY = queryKeys.inbox.unified({ limit: 25, infinite: true });

  const ORG_ALPHA_PAGE: InfiniteData<UnifiedInboxResponse> = {
    pages: [
      {
        items: [],
        hasMore: false,
        nextCursor: null,
        sources: [],
        degraded: false,
      },
    ],
    pageParams: [undefined],
  };

  function scopedClient(orgId: string): QueryClient {
    return new QueryClient({
      defaultOptions: {
        queries: {
          queryKeyHashFn: scopedQueryKeyHashFn(authenticatedScope(orgId, USER)),
        },
      },
    });
  }

  it("the org-beta client reads nothing written under org-alpha", () => {
    const alpha = scopedClient("org-alpha");
    alpha.setQueryData<InfiniteData<UnifiedInboxResponse>>(UNIFIED_KEY, ORG_ALPHA_PAGE);
    expect(alpha.getQueryData(UNIFIED_KEY)).toEqual(ORG_ALPHA_PAGE);

    const beta = scopedClient("org-beta");
    expect(beta.getQueryData(UNIFIED_KEY)).toBeUndefined();
  });

  it("proves the guard bites: an unscoped client hands org-alpha's inbox to org-beta", () => {
    const shared = new QueryClient();
    shared.setQueryData<InfiniteData<UnifiedInboxResponse>>(UNIFIED_KEY, ORG_ALPHA_PAGE);
    expect(shared.getQueryData(UNIFIED_KEY)).toEqual(ORG_ALPHA_PAGE);
  });

  it("clear() empties the unified inbox entry, the defence-in-depth switch path", () => {
    const alpha = scopedClient("org-alpha");
    alpha.setQueryData<InfiniteData<UnifiedInboxResponse>>(UNIFIED_KEY, ORG_ALPHA_PAGE);

    alpha.clear();

    expect(alpha.getQueryData(UNIFIED_KEY)).toBeUndefined();
  });
});
