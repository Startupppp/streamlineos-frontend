import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useNotificationEvents } from "./use-notification-events";

const mockConsumeStream = jest.fn();

jest.mock("./notification-event-stream", () => ({
  consumeNotificationStream: (...args: unknown[]) => mockConsumeStream(...args),
}));

const useSessionMock = jest.fn();
jest.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}));

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
    savedFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes("/notifications/events/token"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: "tok" }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ backendJwt: "jwt" }) });
    }) as typeof global.fetch;

    mockConsumeStream.mockImplementation(
      (_url: unknown, _token: unknown, signal: AbortSignal) =>
        new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve());
        }),
    );

    useSessionMock.mockReturnValue({ data: { orgId: "org-1" }, status: "authenticated" });
    useRouterMock.mockReturnValue({ push: jest.fn() });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.fetch = savedFetch;
    mockConsumeStream.mockClear();
    useSessionMock.mockClear();
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

  it("aborts the stream and opens a new one when orgId changes", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = renderHook(() => useNotificationEvents(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(mockConsumeStream).toHaveBeenCalledTimes(1));
    const firstSignal = (mockConsumeStream.mock.calls[0] as [string, string, AbortSignal])[2];
    expect(firstSignal.aborted).toBe(false);

    act(() => {
      useSessionMock.mockReturnValue({ data: { orgId: "org-2" }, status: "authenticated" });
      rerender();
    });

    expect(firstSignal.aborted).toBe(true);
    await waitFor(() => expect(mockConsumeStream).toHaveBeenCalledTimes(2));
  });
});
