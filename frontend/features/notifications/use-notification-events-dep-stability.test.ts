import { renderHook, act, waitFor } from "@testing-library/react";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { clearStreamToken, useNotificationEvents } from "./use-notification-events";

const mockConsumeStream = jest.fn();

jest.mock("./notification-event-stream", () => ({
  consumeNotificationStream: (...args: unknown[]) => mockConsumeStream(...args),
}));

const mockUseSession = jest.fn();
jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));
jest.mock("@/lib/org-scoped-storage", () => ({ useOrgStorageScope: () => `authenticated:${mockUseSession().data?.orgId ?? ""}:${mockUseSession().data?.user?.id ?? ""}` }));

const useRouterMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => useRouterMock(),
}));

jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useNotificationEvents — effect dependency array stability", () => {
  let savedFetch: typeof global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    clearStreamToken();
    savedFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes("/notifications/events/token"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: "tok" }) });
      const data = mockUseSession().data;
      const backendJwt = `header.${Buffer.from(JSON.stringify({ sub: data?.user?.id, orgId: data?.orgId, sessionId: data?.sessionId, exp: 9_999_999_999 })).toString("base64url")}.signature`;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ backendJwt }) });
    }) as typeof global.fetch;

    mockConsumeStream.mockImplementation(
      (_url: unknown, _token: unknown, signal: AbortSignal) =>
        new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve());
        }),
    );

    mockUseSession.mockReturnValue({ data: { orgId: "org-1", user: { id: "user-1" }, sessionId: "session-1" }, status: "authenticated" });
    useRouterMock.mockReturnValue({ push: jest.fn() });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.fetch = savedFetch;
    mockConsumeStream.mockClear();
    mockUseSession.mockClear();
    useRouterMock.mockClear();
  });

  it("does not abort the live stream when router returns a new object reference", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = renderHook(() => useNotificationEvents(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(mockConsumeStream).toHaveBeenCalledTimes(1));
    const firstSignal = (mockConsumeStream.mock.calls[0] as [string, string, AbortSignal])[2];
    expect(firstSignal.aborted).toBe(false);

    act(() => {
      useRouterMock.mockReturnValue({ push: jest.fn() });
      rerender();
    });

    expect(firstSignal.aborted).toBe(false);
    expect(mockConsumeStream).toHaveBeenCalledTimes(1);
  });

  it("does not restart the stream during a claims refresh", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = renderHook(() => useNotificationEvents(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(mockConsumeStream).toHaveBeenCalledTimes(1));
    const firstSignal = (mockConsumeStream.mock.calls[0] as [string, string, AbortSignal])[2];

    act(() => {
      mockUseSession.mockReturnValue({ data: { orgId: "org-1", user: { id: "user-1" }, sessionId: "session-1" }, status: "loading" });
      rerender();
    });

    expect(firstSignal.aborted).toBe(false);
    expect(mockConsumeStream).toHaveBeenCalledTimes(1);
  });

  it("aborts the stream and opens a new one when orgId changes", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = renderHook(() => useNotificationEvents(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(mockConsumeStream).toHaveBeenCalledTimes(1));
    const firstSignal = (mockConsumeStream.mock.calls[0] as [string, string, AbortSignal])[2];
    expect(firstSignal.aborted).toBe(false);

    act(() => {
      mockUseSession.mockReturnValue({ data: { orgId: "org-2", user: { id: "user-1" }, sessionId: "session-1" }, status: "authenticated" });
      rerender();
    });

    expect(firstSignal.aborted).toBe(true);
    await waitFor(() => expect(mockConsumeStream).toHaveBeenCalledTimes(2));
  });
});
