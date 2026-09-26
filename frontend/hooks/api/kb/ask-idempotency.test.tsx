import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";

interface StreamRequest { headers?: Record<string, string>; signal?: AbortSignal }
const post = jest.fn<Promise<unknown>, [StreamRequest]>();

jest.mock("@/hooks/api/ai-result-stream", () => ({
  streamAiResult: (request: StreamRequest) => post(request),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _key: string,
    options: { mutationFn: (input: unknown) => Promise<unknown>; onSuccess?: () => void },
  ) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

import { useKbAsk } from "./ask";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function keySentOnCall(index: number): string {
  const config = post.mock.calls[index]?.[0];
  const key = config?.headers?.[IDEMPOTENCY_HEADER];
  if (typeof key !== "string" || key.length === 0)
    throw new Error(`call ${index} sent no ${IDEMPOTENCY_HEADER}`);
  return key;
}

describe("useKbAsk idempotency key", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("sends an Idempotency-Key", async () => {
    post.mockResolvedValue({ answer: "a", citations: [] });
    const { result } = renderHook(() => useKbAsk(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ question: "what is the leave policy?" });
    });

    expect(keySentOnCall(0)).toEqual(expect.any(String));
  });

  it("reuses the SAME key when the same question is retried after a failure", async () => {
    post.mockRejectedValueOnce(new Error("network timeout"));
    post.mockResolvedValueOnce({ answer: "a", citations: [] });
    const { result } = renderHook(() => useKbAsk(), { wrapper });
    const input = { question: "what is the leave policy?" };

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toThrow("network timeout");
    });
    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(post).toHaveBeenCalledTimes(2);
    expect(keySentOnCall(1)).toBe(keySentOnCall(0));
  });

  it("mints a NEW key once an answer came back, so a deliberate re-ask is a real re-ask", async () => {
    post.mockResolvedValue({ answer: "a", citations: [] });
    const { result } = renderHook(() => useKbAsk(), { wrapper });
    const input = { question: "what is the leave policy?" };

    await act(async () => {
      await result.current.mutateAsync(input);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(keySentOnCall(1)).not.toBe(keySentOnCall(0));
  });

  it("gives a different question its own key, so one ask cannot replay another's answer", async () => {
    post.mockRejectedValue(new Error("network timeout"));
    const { result } = renderHook(() => useKbAsk(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ question: "leave policy?" })).rejects.toThrow();
    });
    await act(async () => {
      await expect(result.current.mutateAsync({ question: "expense policy?" })).rejects.toThrow();
    });

    expect(keySentOnCall(1)).not.toBe(keySentOnCall(0));
  });

  it("only resets a failed paid attempt when the user explicitly requests a new answer", async () => {
    post.mockRejectedValue(new Error("The previous generation was interrupted"));
    const { result } = renderHook(() => useKbAsk(), { wrapper });
    const input = { question: "leave policy?" };
    await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toThrow(); });
    const firstKey = keySentOnCall(0);
    act(() => result.current.resetAttempt());
    await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toThrow(); });
    expect(keySentOnCall(1)).not.toBe(firstKey);
  });

  it("keeps the signal out of the key's signature but still passes it through", async () => {
    post.mockRejectedValue(new Error("network timeout"));
    const { result } = renderHook(() => useKbAsk(), { wrapper });
    const question = "leave policy?";

    await act(async () => {
      await expect(
        result.current.mutateAsync({ question, signal: new AbortController().signal }),
      ).rejects.toThrow();
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ question, signal: new AbortController().signal }),
      ).rejects.toThrow();
    });

    expect(keySentOnCall(1)).toBe(keySentOnCall(0));
    expect(post.mock.calls[0]?.[0].signal).toBeInstanceOf(
      AbortSignal,
    );
  });
});
