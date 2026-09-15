import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUpdateComment, useDeleteComment } from "@/hooks/api/build/comment-mutations";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { apiClient } from "@/lib/api-client";
import type { Ticket, TicketComment } from "@/types/projects";

jest.mock("@/lib/api-client", () => ({
  apiClient: { patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: ["build:tickets:update"] }, refetch: jest.fn() }),
}));

jest.mock("@/lib/rbac/permission-gate", () => ({ grantsPermission: () => true }));

const patch = jest.mocked(apiClient.patch);
const del = jest.mocked(apiClient.delete);

const TICKET_ID = 7;
const PROJECT_ID = 3;

function comment(id: number, content: string, parentCommentId: number | null = null): TicketComment {
  return {
    id,
    orgId: "org-1",
    ticketId: TICKET_ID,
    userId: "user-1",
    content,
    parentCommentId,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
  };
}

function ticketWith(comments: TicketComment[]): Ticket {
  return { id: TICKET_ID, comments } as unknown as Ticket;
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function invalidatedKeys(spy: jest.SpyInstance): string[] {
  return spy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
}

const ticketKey = buildWorkQueryKeys.projects.ticket(TICKET_ID);
const activityKey = accountingAndSupportQueryKeys.ticketActivity.list(TICKET_ID);

beforeEach(() => {
  patch.mockReset().mockResolvedValue({ updated: true });
  del.mockReset().mockResolvedValue(undefined);
});

describe("useUpdateComment", () => {
  it("writes the new body into the cached ticket instead of refetching it", async () => {
    const client = makeClient();
    client.setQueryData<Ticket>(ticketKey, ticketWith([comment(1, "old")]));
    const invalidate = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateComment(), { wrapper: wrap(client) });
    result.current.mutate({
      commentId: 1,
      ticketId: TICKET_ID,
      projectId: PROJECT_ID,
      content: "new",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData<Ticket>(ticketKey)?.comments?.[0].content).toBe("new");
    expect(invalidatedKeys(invalidate)).not.toContain(JSON.stringify(ticketKey));
  });

  it("marks the comment edited so the (edited) label appears without a round trip", async () => {
    const client = makeClient();
    client.setQueryData<Ticket>(ticketKey, ticketWith([comment(1, "old")]));

    const { result } = renderHook(() => useUpdateComment(), { wrapper: wrap(client) });
    result.current.mutate({
      commentId: 1,
      ticketId: TICKET_ID,
      projectId: PROJECT_ID,
      content: "new",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const edited = client.getQueryData<Ticket>(ticketKey)?.comments?.[0];
    expect(new Date(edited?.updatedAt ?? 0).getTime()).toBeGreaterThan(
      new Date(edited?.createdAt ?? 0).getTime(),
    );
  });

  it("still refetches the activity log, which gains a row", async () => {
    const client = makeClient();
    client.setQueryData<Ticket>(ticketKey, ticketWith([comment(1, "old")]));
    const invalidate = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateComment(), { wrapper: wrap(client) });
    result.current.mutate({
      commentId: 1,
      ticketId: TICKET_ID,
      projectId: PROJECT_ID,
      content: "new",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidatedKeys(invalidate)).toContain(JSON.stringify(activityKey));
  });
});

describe("useDeleteComment", () => {
  it("removes the comment and its replies from the cache instead of refetching the ticket", async () => {
    const client = makeClient();
    client.setQueryData<Ticket>(
      ticketKey,
      ticketWith([comment(1, "parent"), comment(2, "reply", 1), comment(3, "other")]),
    );
    const invalidate = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useDeleteComment(), { wrapper: wrap(client) });
    result.current.mutate({ commentId: 1, ticketId: TICKET_ID, projectId: PROJECT_ID });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData<Ticket>(ticketKey)?.comments?.map((c) => c.id)).toEqual([3]);
    expect(invalidatedKeys(invalidate)).not.toContain(JSON.stringify(ticketKey));
  });

  it("restores the removed comments when the delete fails", async () => {
    del.mockRejectedValue(new Error("nope"));
    const client = makeClient();
    client.setQueryData<Ticket>(ticketKey, ticketWith([comment(1, "parent"), comment(2, "reply", 1)]));

    const { result } = renderHook(() => useDeleteComment(), { wrapper: wrap(client) });
    result.current.mutate({ commentId: 1, ticketId: TICKET_ID, projectId: PROJECT_ID });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(client.getQueryData<Ticket>(ticketKey)?.comments?.map((c) => c.id)).toEqual([1, 2]);
  });
});
