"use client";

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import type { Ticket, CursorPageResponse } from "@/types/projects";
import { useCreateTicket } from "./ticket-create-rank-mutations";
import { useAddComment } from "./ticket-sub-resources";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: {
      isOrgOwner: false,
      scopes: { "build:tickets:create": "all" },
      modules: {},
    },
    refetch: jest.fn(),
  })),
  useCan: jest.fn().mockReturnValue(true),
}));

const { apiClient } = jest.requireMock("@/lib/api-client");

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(client: QueryClient) {
  return function Wrap({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function makeTicket(id: number, overrides?: Partial<Ticket>): Ticket {
  return {
    id,
    orgId: "org-1",
    title: `Ticket ${id}`,
    type: "TASK",
    status: "TODO",
    priority: null,
    projectId: 42,
    ticketNumber: id,
    epicId: null,
    reporterId: null,
    points: null,
    storyPoints: null,
    link: null,
    rank: "",
    parentTicketId: null,
    originalEstimate: null,
    timeSpent: null,
    startDate: null,
    dueDate: null,
    moduleId: null,
    cycleId: null,
    sequenceId: null,
    estimate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTicketPage(tickets: Ticket[]): CursorPageResponse<Ticket> {
  return {
    data: tickets,
    pagination: { limit: 50, nextCursor: null, hasMore: false },
  };
}

describe("useCreateTicket — optimistic cache updates", () => {
  let client: QueryClient;
  const PROJECT_ID = 42;
  const boardKey = buildWorkQueryKeys.projects.tickets({
    projectId: PROJECT_ID,
    view: "board",
  });
  const listKey = buildWorkQueryKeys.projects.tickets({
    projectId: PROJECT_ID,
  });
  const existingTicket = makeTicket(1);

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    client.setQueryData<CursorPageResponse<Ticket>>(
      boardKey,
      makeTicketPage([existingTicket]),
    );
    client.setQueryData<CursorPageResponse<Ticket>>(
      listKey,
      makeTicketPage([existingTicket]),
    );
  });

  it("prepends a temp ticket to the board cache before the API responds", async () => {
    let resolveApi!: (value: Ticket) => void;
    apiClient.post.mockReturnValue(
      new Promise<Ticket>((res) => { resolveApi = res; }),
    );

    const { result } = renderHook(() => useCreateTicket(), { wrapper: wrap(client) });

    act(() => {
      result.current.mutate({ projectId: PROJECT_ID, title: "Fast ticket", type: "TASK" });
    });

    await waitFor(() => {
      const page = client.getQueryData<CursorPageResponse<Ticket>>(boardKey);
      return (page?.data.length ?? 0) === 2;
    });

    const page = client.getQueryData<CursorPageResponse<Ticket>>(boardKey);
    expect(page?.data).toHaveLength(2);
    expect(page?.data[0].id).toBeLessThan(0);
    expect(page?.data[0].title).toBe("Fast ticket");
    expect(page?.data[1].id).toBe(1);

    resolveApi(makeTicket(99, { title: "Fast ticket" }));
  });

  it("removes the temp ticket from the board cache on API failure", async () => {
    apiClient.post.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useCreateTicket(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: PROJECT_ID, title: "Doomed ticket", type: "TASK" }).catch(() => {});
    });

    await waitFor(() => {
      const page = client.getQueryData<CursorPageResponse<Ticket>>(boardKey);
      return (page?.data.length ?? 0) === 1;
    });

    const page = client.getQueryData<CursorPageResponse<Ticket>>(boardKey);
    expect(page?.data).toHaveLength(1);
    expect(page?.data[0].id).toBe(1);
  });

  it("prepends temp subtask to subtasks cache before the API responds", async () => {
    const PARENT_ID = 10;
    const subtasksKey = buildWorkQueryKeys.projects.subtasks(PARENT_ID, PROJECT_ID);
    const existingSubtask = makeTicket(5, { parentTicketId: PARENT_ID });
    client.setQueryData<Ticket[]>(subtasksKey, [existingSubtask]);

    let resolveApi!: (value: Ticket) => void;
    apiClient.post.mockReturnValue(
      new Promise<Ticket>((res) => { resolveApi = res; }),
    );

    const { result } = renderHook(() => useCreateTicket(), { wrapper: wrap(client) });

    act(() => {
      result.current.mutate({
        projectId: PROJECT_ID,
        title: "Child ticket",
        type: "TASK",
        parentTicketId: PARENT_ID,
      });
    });

    await waitFor(() => {
      const subtasks = client.getQueryData<Ticket[]>(subtasksKey);
      return (subtasks?.length ?? 0) === 2;
    });

    const subtasks = client.getQueryData<Ticket[]>(subtasksKey);
    expect(subtasks).toHaveLength(2);
    expect(subtasks![0].id).toBeLessThan(0);
    expect(subtasks![0].title).toBe("Child ticket");
    expect(subtasks![1].id).toBe(5);

    resolveApi(makeTicket(100, { title: "Child ticket", parentTicketId: PARENT_ID }));
  });
});

describe("useAddComment — optimistic cache updates", () => {
  let client: QueryClient;
  const TICKET_ID = 77;
  const PROJECT_ID = 42;
  const ticketKey = buildWorkQueryKeys.projects.ticket(PROJECT_ID, TICKET_ID);

  const existingTicket: Ticket = makeTicket(TICKET_ID, {
    id: TICKET_ID,
    projectId: PROJECT_ID,
    comments: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    client.setQueryData<Ticket>(ticketKey, existingTicket);
  });

  it("appends a temp comment to ticket.comments before the API responds", async () => {
    let resolveApi!: (value: unknown) => void;
    apiClient.post.mockReturnValue(
      new Promise((res) => { resolveApi = res; }),
    );

    const { result } = renderHook(() => useAddComment(), { wrapper: wrap(client) });

    act(() => {
      result.current.mutate({
        ticketId: TICKET_ID,
        projectId: PROJECT_ID,
        content: "Hello optimism",
        optimisticAuthor: { id: "user-1", name: "Alice", image: null },
      });
    });

    await waitFor(() => {
      const ticket = client.getQueryData<Ticket>(ticketKey);
      return (ticket?.comments?.length ?? 0) === 1;
    });

    const ticket = client.getQueryData<Ticket>(ticketKey);
    expect(ticket?.comments).toHaveLength(1);
    expect(ticket?.comments![0].id).toBeLessThan(0);
    expect(ticket?.comments![0].content).toBe("Hello optimism");
    expect(ticket?.comments![0].user?.id).toBe("user-1");

    resolveApi({
      id: 200,
      orgId: "org-1",
      ticketId: TICKET_ID,
      body: "Hello optimism",
      clientVisible: true,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: "user-1", name: "Alice", image: null, email: null },
    });
  });

  it("removes the temp comment from ticket.comments on API failure", async () => {
    apiClient.post.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useAddComment(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({
        ticketId: TICKET_ID,
        projectId: PROJECT_ID,
        content: "Doomed comment",
      }).catch(() => {});
    });

    await waitFor(() => {
      const ticket = client.getQueryData<Ticket>(ticketKey);
      return (ticket?.comments?.length ?? 0) === 0;
    });

    const ticket = client.getQueryData<Ticket>(ticketKey);
    expect(ticket?.comments ?? []).toHaveLength(0);
  });
});
