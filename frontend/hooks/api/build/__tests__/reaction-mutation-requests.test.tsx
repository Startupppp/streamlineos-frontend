import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAddReaction, useRemoveReaction } from "@/hooks/api/build/reactions";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import type { Ticket, TicketComment } from "@/types/projects";

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: ["build:tickets:update"] }, refetch: jest.fn() }),
}));

jest.mock("@/lib/rbac/permission-gate", () => ({ grantsPermission: () => true }));

const post = jest.mocked(apiClient.post);
const del = jest.mocked(apiClient.delete);

const TICKET_ID = 7;
const PROJECT_ID = 3;
const ticketKey = buildWorkQueryKeys.projects.ticket(TICKET_ID);

function comment(id: number): TicketComment {
  return {
    id,
    orgId: "org-1",
    ticketId: TICKET_ID,
    userId: "user-1",
    content: "hello",
    parentCommentId: null,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
    reactions: [],
  };
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

beforeEach(() => {
  post.mockReset().mockResolvedValue({ commentId: 1, userId: "user-1", emoji: "👍" });
  del.mockReset().mockResolvedValue(undefined);
});

describe("useAddReaction", () => {
  it("writes the reaction onto the cached comment instead of waiting for a ticket refetch", async () => {
    const client = makeClient();
    client.setQueryData<Ticket>(ticketKey, { id: TICKET_ID, comments: [comment(1)] } as Ticket);

    const { result } = renderHook(() => useAddReaction(PROJECT_ID, TICKET_ID), {
      wrapper: wrap(client),
    });
    result.current.mutate({ commentId: 1, emoji: "👍", userId: "user-1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData<Ticket>(ticketKey)?.comments?.[0].reactions).toEqual([
      { emoji: "👍", userId: "user-1" },
    ]);
  });
});

describe("useRemoveReaction", () => {
  it("drops the actor's reaction from the cached comment", async () => {
    const client = makeClient();
    client.setQueryData<Ticket>(ticketKey, {
      id: TICKET_ID,
      comments: [
        {
          ...comment(1),
          reactions: [
            { emoji: "👍", userId: "user-1" },
            { emoji: "👍", userId: "user-2" },
          ],
        },
      ],
    } as Ticket);

    const { result } = renderHook(() => useRemoveReaction(PROJECT_ID, TICKET_ID), {
      wrapper: wrap(client),
    });
    result.current.mutate({ commentId: 1, emoji: "👍", userId: "user-1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData<Ticket>(ticketKey)?.comments?.[0].reactions).toEqual([
      { emoji: "👍", userId: "user-2" },
    ]);
  });
});
