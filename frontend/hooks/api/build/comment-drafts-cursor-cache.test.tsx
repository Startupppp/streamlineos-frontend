import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { CommentDraftsListMineResponse } from "@/contracts/build-contracts.generated";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { applyCommentDraftReceipt } from "./comment-draft-command-cache";
import { useDeleteCommentDraft, useMyCommentDrafts } from "./comment-drafts";

const mockDelete = jest.fn();
const mockGet = jest.fn();
jest.mock("@/lib/api-client", () => ({ apiClient: { delete: (...args: unknown[]) => mockDelete(...args), get: (...args: unknown[]) => mockGet(...args) } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: Record<string, unknown>) => {
    const { useMutation } = jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
    return useMutation(options);
  },
}));

type DraftPages = InfiniteData<CommentDraftsListMineResponse>;
function draft(id: number): CommentDraftsListMineResponse["data"][number] {
  return {
    id, orgId: "org-a", membershipId: 1, ticketId: id * 10, body: `Draft ${id}`,
    createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
    ticket: { id: id * 10, projectId: 1, projectKey: "BLD", projectName: "Build", ticketNumber: id, title: `Ticket ${id}`, status: "IN_PROGRESS", priority: "MEDIUM", type: "TASK", assignee: null },
  };
}
function pages(ids: number[]): DraftPages {
  return { pages: [{ data: ids.map(draft), pagination: { limit: 25, nextCursor: null, hasMore: false } }], pageParams: [null] };
}
function setup() {
  const client = createAppQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  const first = buildWorkQueryKeys.projects.commentDrafts.mine();
  const second = buildWorkQueryKeys.projects.commentDrafts.mine("second");
  client.setQueryData(first, pages([1]));
  client.setQueryData(second, pages([2, 3]));
  function Wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }
  return { client, first, second, wrapper: Wrapper };
}

beforeEach(() => { mockDelete.mockReset().mockResolvedValue({ deleted: true }); mockGet.mockReset(); });

it("requests the URL cursor with an abort signal and retains only a bounded server page", async () => {
  const { client, wrapper } = setup();
  client.clear();
  mockGet.mockResolvedValueOnce({ data: [draft(2)], pagination: { limit: 25, hasMore: true, nextCursor: "next" } })
    .mockResolvedValueOnce({ data: [draft(3)], pagination: { limit: 25, hasMore: false, nextCursor: null } });
  const { result } = renderHook(() => useMyCommentDrafts("from-url"), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.pages[0].data.map((item) => item.id)).toEqual([2]);
  expect(mockGet).toHaveBeenNthCalledWith(1, "/build/comment-drafts/mine", { cursor: "from-url" }, expect.any(AbortSignal), expect.any(Function));
  await act(async () => {
    const next = await result.current.fetchNextPage();
    expect(next.error).toBeNull();
    expect(mockGet.mock.calls).toEqual([
      ["/build/comment-drafts/mine", { cursor: "from-url" }, expect.any(AbortSignal), expect.any(Function)],
      ["/build/comment-drafts/mine", { cursor: "next" }, expect.any(AbortSignal), expect.any(Function)],
    ]);
  });
  await waitFor(() => expect(result.current.data?.pages[0].data.map((item) => item.id)).toEqual([3]));
  expect(result.current.data?.pages).toHaveLength(1);
});

it("patches a saved draft in its cursor page without inserting it into unrelated pages or refetching", () => {
  const { client, first, second } = setup();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  applyCommentDraftReceipt(client, 20, { ...draft(2), body: "Edited body" }, "owner");
  expect(client.getQueryData<DraftPages>(second)?.pages[0].data[0].body).toBe("Edited body");
  expect(client.getQueryData<DraftPages>(first)?.pages[0].data.map((item) => item.id)).toEqual([1]);
  expect(invalidate.mock.calls.every(([options]) => options?.refetchType === "none")).toBe(true);
});

it("deletes a submitted draft from every cached cursor page", () => {
  const { client, first, second } = setup();
  applyCommentDraftReceipt(client, 20, null, "owner");
  expect(client.getQueryData<DraftPages>(first)?.pages[0].data.map((item) => item.id)).toEqual([1]);
  expect(client.getQueryData<DraftPages>(second)?.pages[0].data.map((item) => item.id)).toEqual([3]);
});

it("removes only the selected draft from its cursor page and preserves unrelated cache data", async () => {
  const { client, first, second, wrapper } = setup();
  const { result } = renderHook(() => useDeleteCommentDraft(), { wrapper });
  await act(async () => { await result.current.mutateAsync(2); });
  expect(mockDelete).toHaveBeenCalledWith("/build/comment-drafts/2", undefined, undefined, expect.any(Function));
  expect(client.getQueryData<DraftPages>(first)?.pages[0].data.map((item) => item.id)).toEqual([1]);
  expect(client.getQueryData<DraftPages>(second)?.pages[0].data.map((item) => item.id)).toEqual([3]);
});

it("restores a failed deletion only to the pages it came from without overwriting a newer unrelated edit", async () => {
  const { client, first, second, wrapper } = setup();
  mockDelete.mockImplementation(async () => {
    client.setQueryData<DraftPages>(second, (current) => current ? { ...current, pages: current.pages.map((page) => ({ ...page, data: page.data.map((item) => ({ ...item, body: "Newer unrelated edit" })) })) } : current);
    throw new Error("Delete failed");
  });
  const { result } = renderHook(() => useDeleteCommentDraft(), { wrapper });
  await act(async () => { await expect(result.current.mutateAsync(2)).rejects.toThrow("Delete failed"); });
  expect(client.getQueryData<DraftPages>(first)?.pages[0].data.map((item) => item.id)).toEqual([1]);
  expect(client.getQueryData<DraftPages>(second)?.pages[0].data).toEqual([draft(2), { ...draft(3), body: "Newer unrelated edit" }]);
});

it("rolls back when the server does not confirm deletion", async () => {
  const { client, second, wrapper } = setup();
  mockDelete.mockResolvedValue({ deleted: false });
  const { result } = renderHook(() => useDeleteCommentDraft(), { wrapper });
  await act(async () => { await expect(result.current.mutateAsync(2)).rejects.toThrow("The draft deletion was not confirmed."); });
  expect(client.getQueryData<DraftPages>(second)?.pages[0].data.map((item) => item.id)).toEqual([2, 3]);
});
