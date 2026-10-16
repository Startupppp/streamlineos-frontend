import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { clearBackendTokenCache, resetOutageCircuit, seedBackendToken } from "@/lib/api-client";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useKbPageRecordLinks } from "./record-links";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

installAbortSignalPolyfill();

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
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
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearBackendTokenCache();
  client.clear();
});

it("loads later record-link pages and keeps the cursor result in the cache", async () => {
  const first = { id: 2, targetType: "project", targetId: "9", label: "Project 9" };
  const second = { id: 1, targetType: "project", targetId: "8", label: "Project 8" };
  fetchMock.mockResolvedValueOnce(response({
    data: [first],
    pagination: { limit: 50, hasMore: true, nextCursor: "cursor-2" },
  }));
  fetchMock.mockResolvedValueOnce(response({
    data: [second],
    pagination: { limit: 50, hasMore: false, nextCursor: null },
  }));

  const { result } = renderHook(() => useKbPageRecordLinks(7), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual([first]));
  expect(result.current.hasNextPage).toBe(true);
  await act(async () => {
    await result.current.fetchNextPage();
  });
  await waitFor(() => expect(result.current.data).toEqual([first, second]));
  expect(result.current.hasNextPage).toBe(false);
  expect(fetchMock.mock.calls[1]?.[0]).toContain("cursor=cursor-2");
  expect(client.getQueryData(knowledgeAndSurveysQueryKeys.kb.pageRecordLinks(7))).toMatchObject({
    pageParams: [undefined, "cursor-2"],
    pages: [{ data: [first] }, { data: [second] }],
  });
});
