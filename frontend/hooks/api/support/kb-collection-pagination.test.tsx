import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import type { ReactNode } from "react";
import { clearBackendTokenCache, seedBackendToken } from "@/lib/api-client";
import { resetOutageCircuit } from "@/lib/api-outage-circuit";
import { permissionGate } from "@/lib/rbac/permission-gate";
import { ApiContractError } from "@/lib/api-envelope";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { useSupportKbArticles, useSupportKbCategories } from "./kb";
import { useSupportKbComments } from "./kb-comments";

let mockGate = permissionGate("support:kb:view", true, true);

installAbortSignalPolyfill();

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => mockGate,
}));

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
const category = {
  id: 1,
  orgId: "org-1",
  spaceId: null,
  parentId: null,
  name: "Guides",
  slug: "guides",
  description: null,
  icon: null,
  sortOrder: 1,
  isPublished: true,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
};
const comment = {
  id: 10,
  articleId: 4,
  body: "Review this",
  userId: "user-1",
  userName: "Ada",
  userImage: null,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
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
  mockGate = permissionGate("support:kb:view", true, true);
  client = createAppQueryClient("support-kb-collections-test");
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearBackendTokenCache();
  client.clear();
});

describe("Support Knowledge Base collection HTTP contracts", () => {
  it("loads category cursor pages and keeps raw pagination metadata", async () => {
    fetchMock
      .mockResolvedValueOnce(response({
        data: [category],
        pagination: { limit: 50, hasMore: true, nextCursor: "category-2" },
      }))
      .mockResolvedValueOnce(response({
        data: [{ ...category, id: 2, name: "Policies" }],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      }));

    const { result } = renderHook(() => useSupportKbCategories(), { wrapper });
    await waitFor(() => {
      if (result.current.error) throw result.current.error;
      expect(result.current.hasNextPage).toBe(true);
    });
    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    expect(result.current.data?.map((row) => row.name)).toEqual(["Guides", "Policies"]);
    expect(result.current.access.allowed).toBe(true);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/support/kb/categories?cursor=category-2");
  });

  it("loads comment cursor pages through the same HTTP parser", async () => {
    fetchMock
      .mockResolvedValueOnce(response({
        data: [comment],
        pagination: { limit: 50, hasMore: true, nextCursor: "comment-2" },
      }))
      .mockResolvedValueOnce(response({
        data: [{ ...comment, id: 9, body: "Earlier note" }],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      }));

    const { result } = renderHook(() => useSupportKbComments(4), { wrapper });
    await waitFor(() => {
      if (result.current.error) throw result.current.error;
      expect(result.current.hasNextPage).toBe(true);
    });
    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    expect(result.current.data?.map((row) => row.body)).toEqual(["Review this", "Earlier note"]);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/support/kb/articles/4/comments?cursor=comment-2");
  });

  it("does not fetch either collection while permission is denied", async () => {
    mockGate = permissionGate("support:kb:view", false, true);
    const categories = renderHook(() => useSupportKbCategories(), { wrapper });
    const comments = renderHook(() => useSupportKbComments(4), { wrapper });

    expect(categories.result.current.access.denied).toBe(true);
    expect(comments.result.current.access.denied).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps a deployed legacy category array as an inline contract error without claiming the collection ended", async () => {
    fetchMock.mockResolvedValueOnce(response([category]));

    const { result } = renderHook(() => useSupportKbCategories(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiContractError);
    expect(result.current.data).toBeUndefined();
    expect(result.current.hasNextPage).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a deployed legacy comment array as an inline contract error", async () => {
    fetchMock.mockResolvedValueOnce(response([comment]));

    const { result } = renderHook(() => useSupportKbComments(4), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiContractError);
    expect(result.current.data).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps an article list contract error inline for the manager retry state", async () => {
    fetchMock.mockResolvedValueOnce(response({ unexpected: true }));

    const { result } = renderHook(() => useSupportKbArticles(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiContractError);
    expect(result.current.data).toBeUndefined();
  });
});
