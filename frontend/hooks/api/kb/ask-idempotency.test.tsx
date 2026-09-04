import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";

const post = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: (...args: unknown[]) => post(...args) },
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
  const config = post.mock.calls[index]?.[2] as
    | { headers?: Record<string, string> }
    | undefined;
  const key = config?.headers?.[IDEMPOTENCY_HEADER];
  if (typeof key !== "string" || key.length === 0)
    throw new Error(`call ${index} sent no ${IDEMPOTENCY_HEADER}`);
  return key;
}

/**
 * `POST /kb/ask` is `@Idempotent("kb.ask")` and spends credits twice over — an embedding
 * for the query and a full completion for the answer. The fence on the backend is only
 * half the protection: it can only replay a retry that carries the SAME key, and
 * `authedFetch` mints a fallback key per HTTP call, so a hook that sends no key of its
 * own makes every retry a new operation and the fence inert.
 */
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

  /** An AbortSignal is not part of the question's identity and does not survive JSON.stringify. */
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
    expect((post.mock.calls[0]?.[2] as { signal?: AbortSignal }).signal).toBeInstanceOf(
      AbortSignal,
    );
  });
});
