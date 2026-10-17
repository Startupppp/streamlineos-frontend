import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { clearBackendTokenCache, seedBackendToken } from "@/lib/api-client";
import { resetOutageCircuit } from "@/lib/api-outage-circuit";
import { ApiContractError } from "@/lib/api-envelope";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { useKnowledgeGaps } from "./analytics";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

installAbortSignalPolyfill();

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
const gap = {
  query: "reset password",
  count: 3,
  lastOccurredAt: "2026-09-25T00:00:00.000Z",
};
let client: QueryClient;

function response(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ success: true, data }),
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  resetOutageCircuit();
  clearBackendTokenCache();
  seedBackendToken("header." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url") + ".signature");
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  client = createAppQueryClient("kb-gaps-http-test");
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false, throwOnError: false },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearBackendTokenCache();
  client.clear();
});

describe("KB analytics gaps through the HTTP parser", () => {
  it("rejects a bare array rather than claiming pagination is complete", async () => {
    fetchMock.mockResolvedValue(response([gap]));

    const { result } = renderHook(() => useKnowledgeGaps(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiContractError);
    expect(result.current.gaps).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves scope coverage and follows a real cursor page", async () => {
    const nextGap = { ...gap, query: "billing" };
    fetchMock
      .mockResolvedValueOnce(response({
        data: [gap],
        pagination: { limit: 1, hasMore: true, nextCursor: "cursor-2" },
        scopeComplete: true,
      }))
      .mockResolvedValueOnce(response({
        data: [nextGap],
        pagination: { limit: 1, hasMore: false, nextCursor: null },
        scopeComplete: true,
      }));

    const { result } = renderHook(() => useKnowledgeGaps(), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.gaps).toEqual([gap, nextGap]));

    expect(result.current.scopeComplete).toBe(true);
    expect(result.current.hasNextPage).toBe(false);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/kb/analytics/gaps?cursor=cursor-2");
  });
});
