import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

import React from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { createAppQueryClient } from "@/components/providers/query-provider";

describe("a mutation whose request never answers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearBackendTokenCache();
    jest.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("timed out", "TimeoutError")), ms);
      return controller.signal;
    });
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/auth/session"))
        return Promise.resolve(new Response(JSON.stringify({ backendJwt: "a.b.c" })));
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function renderSave(onError?: () => void) {
    const client = createAppQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return renderHook(
      () => useMutation({ mutationFn: () => apiClient.post("/hr/leaves", { days: 1 }), onError }),
      { wrapper },
    );
  }

  it("errors as a TIMEOUT and raises a toast within 15 seconds", async () => {
    const shown = jest.spyOn(toast, "error");
    const { result } = renderSave();

    act(() => result.current.mutate());
    await act(() => jest.advanceTimersByTimeAsync(14_999));
    expect(result.current.status).toBe("pending");
    await act(() => jest.advanceTimersByTimeAsync(10));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatchObject({ code: "TIMEOUT" });

    await act(() => jest.advanceTimersByTimeAsync(300));
    expect(shown).toHaveBeenCalledWith("Request timed out. Please try again.");
  });

  it("errors within 15 seconds when the backend-token read is what stalls", async () => {
    global.fetch = jest.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    ) as unknown as typeof fetch;
    const { result } = renderSave();

    act(() => result.current.mutate());
    await act(() => jest.advanceTimersByTimeAsync(15_010));

    expect(result.current.error).toMatchObject({ code: "TIMEOUT" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not toast twice when the screen reports the failure itself", async () => {
    const shown = jest.spyOn(toast, "error");
    const { result } = renderSave(() => toast.error("Couldn't save the leave."));

    act(() => result.current.mutate());
    await act(() => jest.advanceTimersByTimeAsync(15_300));

    expect(shown).toHaveBeenCalledTimes(1);
    expect(shown).toHaveBeenCalledWith("Couldn't save the leave.");
  });

  it("stays quiet for a mutation that opts out because it shows the error inline", async () => {
    const shown = jest.spyOn(toast, "error");
    const client = createAppQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () => apiClient.post("/hr/leaves", {}),
          meta: { errorToast: false },
        }),
      { wrapper },
    );

    act(() => result.current.mutate());
    await act(() => jest.advanceTimersByTimeAsync(15_300));

    expect(result.current.status).toBe("error");
    expect(shown).not.toHaveBeenCalled();
  });
});
