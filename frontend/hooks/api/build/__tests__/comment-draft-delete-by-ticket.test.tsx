import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDeleteCommentDraftByTicket } from "@/hooks/api/build/comment-draft-commands";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-draft-command-cache";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { OrgStorageScopeProvider } from "@/lib/org-scoped-storage";
import { peekDraftIntents } from "../comment-draft-offline-buffer";
import type { CommentDraftsListMineResponse } from "@/contracts/build-contracts.generated";

type DraftPages = InfiniteData<CommentDraftsListMineResponse>;

function pageCache(items: CommentDraftListItem[]): DraftPages {
  return {
    pages: [{ data: items, pagination: { limit: 100, hasMore: false, nextCursor: null } }],
    pageParams: [null],
  };
}
function flatItems(data: DraftPages | undefined): CommentDraftListItem[] {
  return data?.pages.flatMap((p) => p.data as CommentDraftListItem[]) ?? [];
}

jest.mock("@/lib/api-client", () => ({
  apiClient: { delete: jest.fn() },
  isImpersonating: () => false,
}));
jest.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { id: "user-a" }, orgId: "org-a", sessionId: "session-a" } }) }));

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
  orgId: "org-a",
  membershipId: null,
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
  orgId: "org-a",
  membershipId: null,
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
    return <OrgStorageScopeProvider scope="authenticated:org-a:user-a"><QueryClientProvider client={client}>{children}</QueryClientProvider></OrgStorageScopeProvider>;
  };
}

describe("BUG-050 — useDeleteCommentDraftByTicket patches cache immediately so draft clears without waiting for DELETE to resolve", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(buildWorkQueryKeys.projects.commentDrafts.mine(), pageCache([DRAFT_TICKET_1, DRAFT_TICKET_2]));
    del.mockReset();
    localStorage.clear();
  });

  it("removes the matching ticketId draft from mine() cache optimistically before the DELETE response arrives", async () => {
    let resolve: (v: { deleted: boolean }) => void = () => {};
    del.mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useDeleteCommentDraftByTicket(), { wrapper: wrap(client) });

    await act(async () => { result.current.mutate(100); });

    const cached = flatItems(client.getQueryData<DraftPages>(buildWorkQueryKeys.projects.commentDrafts.mine()));
    expect(cached.some((d) => d.ticketId === 100)).toBe(false);
    expect(cached.some((d) => d.ticketId === 200)).toBe(true);

    resolve({ deleted: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("restores the draft in cache when the DELETE returns an error so the user does not lose visibility", async () => {
    del.mockRejectedValueOnce(new Error("400 Bad Request"));

    const { result } = renderHook(() => useDeleteCommentDraftByTicket(), { wrapper: wrap(client) });

    await act(async () => { await result.current.mutateAsync(100).catch(() => {}); });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = flatItems(client.getQueryData<DraftPages>(buildWorkQueryKeys.projects.commentDrafts.mine()));
    expect(cached.some((d) => d.ticketId === 100)).toBe(true);
    expect(peekDraftIntents("authenticated:org-a:user-a")).toEqual([expect.objectContaining({ kind: "delete", ticketId: 100 })]);
  });

  it("only removes the draft for the specified ticketId, leaving drafts for other tickets intact", async () => {
    del.mockResolvedValueOnce({ deleted: true });

    const { result } = renderHook(() => useDeleteCommentDraftByTicket(), { wrapper: wrap(client) });

    await act(async () => { result.current.mutate(100); });

    const cached = flatItems(client.getQueryData<DraftPages>(buildWorkQueryKeys.projects.commentDrafts.mine()));
    expect(cached.find((d) => d.ticketId === 200)).toBeDefined();
    expect(cached.find((d) => d.ticketId === 100)).toBeUndefined();
    expect(del.mock.calls[0]?.[0]).toBe("/build/comment-drafts/by-ticket/100");
    expect(del.mock.calls[0]?.[1]).toBeUndefined();
    const config = del.mock.calls[0]?.[2];
    if (!config || config instanceof AbortSignal) throw new Error("Expected a fenced request configuration");
    expect(config.expectedIdentity).toEqual({ userId: "user-a", orgId: "org-a", sessionId: "session-a" });
    expect(config.signal).toBeInstanceOf(AbortSignal);
  });

  it("restores only the failed ticket while keeping another ticket's concurrent cache save", async () => {
    let complete: (result: { deleted: boolean }) => void = () => { throw new Error("Uninitialized deferred"); };
    del.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; }));
    const hook = renderHook(() => useDeleteCommentDraftByTicket(), { wrapper: wrap(client) });
    act(() => hook.result.current.mutate(100));
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    client.setQueryData(buildWorkQueryKeys.projects.commentDrafts.mine(), pageCache([{ ...DRAFT_TICKET_2, body: "newer unrelated text" }]));
    await act(async () => { complete({ deleted: false }); });
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(flatItems(client.getQueryData<DraftPages>(buildWorkQueryKeys.projects.commentDrafts.mine()))).toEqual([DRAFT_TICKET_1, { ...DRAFT_TICKET_2, body: "newer unrelated text" }]);
  });
});
