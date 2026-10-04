import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUpsertCommentDraft } from "@/hooks/api/build/comment-drafts";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-drafts";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { OrgStorageScopeProvider } from "@/lib/org-scoped-storage";
import type { CommentDraftsListMineResponse } from "@/contracts/build-contracts.generated";

type DraftPages = InfiniteData<CommentDraftsListMineResponse>;

function pageCache(items: CommentDraftListItem[]): DraftPages {
  return {
    pages: [{ data: items, pagination: { limit: 100, hasMore: false, nextCursor: null } }],
    pageParams: [null],
  };
}
function flatItems(data: DraftPages | undefined): CommentDraftListItem[] {
  return data?.pages.flatMap((p) => p.data) ?? [];
}

jest.mock("@/lib/api-client", () => ({
  apiClient: { put: jest.fn() },
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

const put = jest.mocked(apiClient.put);

const DRAFT: CommentDraftListItem = {
  id: 9,
  orgId: "org-a",
  membershipId: null,
  ticketId: 7,
  body: "half a thought",
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T10:00:05.000Z",
  ticket: {
    id: 7,
    ticketNumber: 42,
    title: "Fix the thing",
    status: "TODO",
    priority: "MEDIUM",
    type: "TASK",
    projectId: 3,
    projectKey: "CORE",
    projectName: "Core",
    assignee: null,
  },
};

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <OrgStorageScopeProvider scope="authenticated:org-a:user-a"><QueryClientProvider client={client}>{children}</QueryClientProvider></OrgStorageScopeProvider>;
  };
}

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

beforeEach(() => {
  localStorage.clear();
  put.mockReset();
  put.mockResolvedValue(DRAFT);
});

describe("useUpsertCommentDraft — autosave does not refetch the draft list", () => {
  it("patches the cached draft list from the response instead of invalidating it", async () => {
    const client = makeClient();
    const key = buildWorkQueryKeys.projects.commentDrafts.mine();
    client.setQueryData(key, pageCache([]));
    const invalidate = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpsertCommentDraft(), { wrapper: wrap(client) });
    result.current.mutate({ ticketId: 7, body: "half a thought" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(flatItems(client.getQueryData<DraftPages>(key))).toEqual([DRAFT]);
    expect(
      invalidate.mock.calls.filter(
        (call) => JSON.stringify(call[0]?.queryKey) === JSON.stringify(key),
      ),
    ).toHaveLength(0);
  });

  it("replaces the existing draft for the same ticket rather than appending a duplicate", async () => {
    const client = makeClient();
    const key = buildWorkQueryKeys.projects.commentDrafts.mine();
    client.setQueryData(key, pageCache([
      { ...DRAFT, body: "older text", updatedAt: "2026-09-15T09:00:00.000Z" },
    ]));

    const { result } = renderHook(() => useUpsertCommentDraft(), { wrapper: wrap(client) });
    result.current.mutate({ ticketId: 7, body: "half a thought" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(flatItems(client.getQueryData<DraftPages>(key))).toEqual([DRAFT]);
  });

  it("leaves an unfetched draft list alone rather than seeding a partial one", async () => {
    const client = makeClient();
    const key = buildWorkQueryKeys.projects.commentDrafts.mine();

    const { result } = renderHook(() => useUpsertCommentDraft(), { wrapper: wrap(client) });
    result.current.mutate({ ticketId: 7, body: "half a thought" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(key)).toBeUndefined();
  });
});
