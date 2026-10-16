import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";
import { clearBackendTokenCache, resetOutageCircuit, seedBackendToken } from "@/lib/api-client";
import { ApiContractError } from "@/lib/api-envelope";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

const mockUseCan = jest.fn(() => true);

jest.mock("@/hooks/api/access", () => ({ useCan: () => mockUseCan() }));

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

import { useKbAsk, useKbAskPageOwners } from "./ask";

installAbortSignalPolyfill();

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

describe("KB Ask page owners through the HTTP parser", () => {
  const originalFetch = globalThis.fetch;
  const fetchMock = jest.fn();
  const first = { membershipId: 77, name: "Ada Lovelace" };
  const selected = { membershipId: 88, name: "Grace Hopper" };
  const pagination = { limit: 50, hasMore: false, nextCursor: null };
  let ownerClient: QueryClient;

  function ownerWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={ownerClient}>{children}</QueryClientProvider>;
  }

  function response(data: unknown) {
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ success: true, data }),
    };
  }

  beforeEach(() => {
    resetOutageCircuit();
    clearBackendTokenCache();
    seedBackendToken("header." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url") + ".signature");
    mockUseCan.mockReturnValue(true);
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    ownerClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearBackendTokenCache();
    ownerClient.clear();
  });

  it("requests KB owner choices with selected label and follows the opaque cursor", async () => {
    fetchMock.mockResolvedValueOnce(response({ data: [first], pagination: { limit: 50, hasMore: true, nextCursor: "opaque-next" }, selected }))
      .mockResolvedValueOnce(response({ data: [], pagination, selected }));
    const { result } = renderHook(() => useKbAskPageOwners("Ada", 88), { wrapper: ownerWrapper });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(result.current.data?.pages[0]?.selected).toEqual(selected);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/kb/pages/owners?");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("search=Ada");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("selectedMembershipId=88");
    await act(async () => { await result.current.fetchNextPage(); });
    expect(fetchMock.mock.calls[1]?.[0]).toContain("cursor=opaque-next");
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it("rejects legacy arrays instead of treating the first 100 owners as complete", async () => {
    fetchMock.mockResolvedValue(response([first]));
    const { result } = renderHook(() => useKbAskPageOwners(""), { wrapper: ownerWrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiContractError);
  });

  it("does not fetch owners without KB page view permission", async () => {
    mockUseCan.mockReturnValue(false);
    const { result } = renderHook(() => useKbAskPageOwners(""), { wrapper: ownerWrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
