import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import {
  useCreateKbPageComment,
  useDeleteKbPageComment,
  useResolveKbPageComment,
  useUpdateKbPageComment,
  type KbPageComment,
  type KbPageCommentsPage,
} from "./page-comments";

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { post: jest.Mock; patch: jest.Mock; delete: jest.Mock };
};

function comment(overrides: Partial<KbPageComment>): KbPageComment {
  return {
    id: 1,
    orgId: "org",
    pageId: 7,
    authorId: "u1",
    authorName: "Ada",
    parentId: null,
    content: "first",
    anchorBlockIndex: null,
    anchorQuote: null,
    resolvedAt: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

const key = knowledgeAndSurveysQueryKeys.kb.pageComments(7);

function setup(nextCursor: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const cached: InfiniteData<KbPageCommentsPage> = {
    pageParams: [undefined],
    pages: [{
      data: [comment({ id: 1 }), comment({ id: 2, parentId: 1, content: "reply" })],
      pagination: { limit: 20, hasMore: nextCursor !== null, nextCursor },
    }],
  };
  client.setQueryData(key, cached);
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const loaded = () => client.getQueryData<InfiniteData<KbPageCommentsPage>>(key)?.pages.flatMap((page) => page.data) ?? [];
  return { client, wrapper, loaded };
}

beforeEach(() => jest.clearAllMocks());

describe("comment mutations update the open thread from the response (KB-B-022)", () => {
  it("shows an edited comment's new text at once", async () => {
    const { wrapper, loaded } = setup();
    apiClient.patch.mockResolvedValueOnce(comment({ id: 1, content: "edited" }));
    const { result } = renderHook(() => useUpdateKbPageComment(), { wrapper });

    await act(async () => { await result.current.mutateAsync({ commentId: 1, pageId: 7, content: "edited" }); });

    expect(loaded().map((c) => c.content)).toEqual(["edited", "reply"]);
  });

  it("marks a resolved comment resolved at once", async () => {
    const { wrapper, loaded } = setup();
    apiClient.post.mockResolvedValueOnce(comment({ id: 1, resolvedAt: "2026-10-02T00:00:00Z" }));
    const { result } = renderHook(() => useResolveKbPageComment(), { wrapper });

    await act(async () => { await result.current.mutateAsync({ commentId: 1, pageId: 7 }); });

    expect(loaded()[0]?.resolvedAt).toBe("2026-10-02T00:00:00Z");
  });

  it("removes a deleted comment and its replies, which the database cascades", async () => {
    const { wrapper, loaded } = setup();
    apiClient.delete.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useDeleteKbPageComment(), { wrapper });

    await act(async () => { await result.current.mutateAsync({ commentId: 1, pageId: 7 }); });

    expect(loaded()).toEqual([]);
  });

  it("appends a posted comment to the last page when every page is loaded", async () => {
    const { wrapper, loaded } = setup();
    apiClient.post.mockResolvedValueOnce(comment({ id: 3, content: "new" }));
    const { result } = renderHook(() => useCreateKbPageComment(), { wrapper });

    await act(async () => { await result.current.mutateAsync({ pageId: 7, content: "new" }); });

    expect(loaded().map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it("refetches instead of appending when later pages are not loaded, because the new comment sorts last", async () => {
    const { client, wrapper, loaded } = setup("cursor-2");
    const invalidate = jest.spyOn(client, "invalidateQueries");
    apiClient.post.mockResolvedValueOnce(comment({ id: 3, content: "new" }));
    const { result } = renderHook(() => useCreateKbPageComment(), { wrapper });

    await act(async () => { await result.current.mutateAsync({ pageId: 7, content: "new" }); });

    expect(loaded().map((c) => c.id)).toEqual([1, 2]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
  });
});
