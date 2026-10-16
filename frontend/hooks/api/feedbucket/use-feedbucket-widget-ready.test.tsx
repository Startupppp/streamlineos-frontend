import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useFeedbucketWidgetReady } from "./use-feedbucket-widget-ready";

jest.mock("@/lib/feedbucket", () => ({
  getFeedbucketApiBase: () => "https://api.test",
  getFeedbucketProjectId: () => "fb_key",
}));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useFeedbucketWidgetReady", () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("probes a key with no widget once, then stops asking in later tabs and page loads", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const first = renderHook(() => useFeedbucketWidgetReady(), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(first.result.current).toBe(false);

    const second = renderHook(() => useFeedbucketWidgetReady(), { wrapper });
    await waitFor(() => expect(second.result.current).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not write off the widget for a transient server error", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce({ ok: true, status: 200 });
    const first = renderHook(() => useFeedbucketWidgetReady(), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(first.result.current).toBe(false);

    const second = renderHook(() => useFeedbucketWidgetReady(), { wrapper });
    await waitFor(() => expect(second.result.current).toBe(true));
  });
});
