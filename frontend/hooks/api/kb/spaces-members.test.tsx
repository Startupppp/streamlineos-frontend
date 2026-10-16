import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { clearBackendTokenCache, seedBackendToken } from "@/lib/api-client";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

import { useKbSpaceMembers } from "./spaces";

installAbortSignalPolyfill();

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;

function member(id: number) {
  return {
    id, orgId: "org-1", spaceId: 9, membershipId: id, role: null, team: null, spaceRole: "editor",
    createdAt: "2026-10-16T00:00:00.000Z", userId: `u-${id}`, userName: `User ${id}`, userEmail: null, userImage: null,
  };
}

function page(rows: unknown[], nextCursor: string | null) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ success: true, data: { data: rows, pagination: { limit: 50, hasMore: nextCursor !== null, nextCursor } } }),
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  clearBackendTokenCache();
  seedBackendToken("header." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url") + ".signature");
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearBackendTokenCache();
});

it("KB-B-032: reads the paginated members page and follows the cursor", async () => {
  fetchMock.mockResolvedValueOnce(page([member(1)], "c1")).mockResolvedValueOnce(page([member(2)], null));
  const { result } = renderHook(() => useKbSpaceMembers(9), { wrapper });

  await waitFor(() => expect(result.current.data).toHaveLength(1));
  expect(result.current.hasNextPage).toBe(true);

  await act(async () => {
    await result.current.fetchNextPage();
  });

  await waitFor(() => expect(result.current.data?.map((m) => m.id)).toEqual([1, 2]));
  expect(String(fetchMock.mock.calls[1][0])).toContain("cursor=c1");
  expect(result.current.hasNextPage).toBe(false);
});
