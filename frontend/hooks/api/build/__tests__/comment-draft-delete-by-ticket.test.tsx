import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDeleteCommentDraftByTicket } from "@/hooks/api/build/comment-drafts";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-drafts";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiClient: { delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: ["build:tickets:view"] }, refetch: jest.fn() }),
}));

jest.mock("@/lib/rbac/permission-gate", () => ({
  grantsPermission: () => true,
}));

const del = jest.mocked(apiClient.delete);

const DRAFT_TICKET_1: CommentDraftListItem = {
  id: 1,
  ticketId: 100,
  body: "draft for ticket 100",
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T10:00:00.000Z",
  ticket: {
    id: 100,
    ticketNumber: 1,
    title: "Ticket 100",
    status: "TODO",
    priority: null,
    type: "BUG",
    projectId: 5,
    projectKey: "PROJ",
    projectName: "Project",
    assignee: null,
  },
};

const DRAFT_TICKET_2: CommentDraftListItem = {
  id: 2,
  ticketId: 200,
  body: "draft for ticket 200",
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T10:00:00.000Z",
  ticket: {
    id: 200,
    ticketNumber: 2,
    title: "Ticket 200",
    status: "TODO",
    priority: null,
    type: "BUG",
    projectId: 5,
    projectKey: "PROJ",
    projectName: "Project",
    assignee: null,
  },
};

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("BUG-050 — useDeleteCommentDraftByTicket patches cache immediately so draft clears without waiting for DELETE to resolve", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(buildWorkQueryKeys.projects.commentDrafts.mine(), [DRAFT_TICKET_1, DRAFT_TICKET_2]);
    del.mockReset();
  });

  it("removes the matching ticketId draft from mine() cache optimistically before the DELETE response arrives", async () => {
    let resolve: (v: { deleted: boolean }) => void = () => {};
    del.mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useDeleteCommentDraftByTicket(), { wrapper: wrap(client) });

    await act(async () => { result.current.mutate(100); });

    const cached = client.getQueryData<CommentDraftListItem[]>(buildWorkQueryKeys.projects.commentDrafts.mine());
    expect(cached?.some((d) => d.ticketId === 100)).toBe(false);
    expect(cached?.some((d) => d.ticketId === 200)).toBe(true);

    resolve({ deleted: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("restores the draft in cache when the DELETE returns an error so the user does not lose visibility", async () => {
    del.mockRejectedValueOnce(new Error("400 Bad Request"));

    const { result } = renderHook(() => useDeleteCommentDraftByTicket(), { wrapper: wrap(client) });

    await act(async () => { await result.current.mutateAsync(100).catch(() => {}); });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = client.getQueryData<CommentDraftListItem[]>(buildWorkQueryKeys.projects.commentDrafts.mine());
    expect(cached?.some((d) => d.ticketId === 100)).toBe(true);
  });

  it("only removes the draft for the specified ticketId, leaving drafts for other tickets intact", async () => {
    del.mockResolvedValueOnce({ deleted: true });

    const { result } = renderHook(() => useDeleteCommentDraftByTicket(), { wrapper: wrap(client) });

    await act(async () => { result.current.mutate(100); });

    const cached = client.getQueryData<CommentDraftListItem[]>(buildWorkQueryKeys.projects.commentDrafts.mine());
    expect(cached?.find((d) => d.ticketId === 200)).toBeDefined();
    expect(cached?.find((d) => d.ticketId === 100)).toBeUndefined();
  });
});
