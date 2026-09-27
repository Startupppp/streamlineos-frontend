"use client";

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useUpdateTicket } from "./ticket-update-mutation";
import { useCreateTicket, useDeleteTicket } from "./ticket-create-rank-mutations";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ id: 99, title: "New", status: "TODO", type: "TASK" }),
    patch: jest.fn().mockResolvedValue({ updated: true, updatedAt: "2026-09-27T10:01:00.000Z" }),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: {
      isOrgOwner: false,
      scopes: { "build:tickets:create": "all", "build:tickets:update": "all", "build:tickets:delete": "all" },
      modules: {},
    },
    refetch: jest.fn(),
  })),
  useCan: jest.fn().mockReturnValue(true),
}));

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

const FILTERED_COUNTS_KEY = buildWorkQueryKeys.projects.columnCounts(42, { type: "BUG" });
const UNFILTERED_COUNTS_KEY = buildWorkQueryKeys.projects.columnCounts(42);

function seedCountsInCache(client: QueryClient) {
  client.setQueryData(FILTERED_COUNTS_KEY, { TODO: 2, IN_PROGRESS: 1 });
  client.setQueryData(UNFILTERED_COUNTS_KEY, { TODO: 10, IN_PROGRESS: 5, DONE: 3 });
}

describe("column-count invalidation — filtered and unfiltered queries (ticket 05)", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    seedCountsInCache(client);
  });

  afterEach(() => {
    client.clear();
  });

  it("a status mutation marks both filtered and unfiltered column-count queries as stale", async () => {
    const { result } = renderHook(() => useUpdateTicket(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 1, status: "DONE" });
    });

    expect(client.getQueryState(FILTERED_COUNTS_KEY)?.isInvalidated).toBe(true);
    expect(client.getQueryState(UNFILTERED_COUNTS_KEY)?.isInvalidated).toBe(true);
  });

  it("a create mutation invalidates both filtered and unfiltered column-count queries", async () => {
    const { result } = renderHook(() => useCreateTicket(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 42, title: "New ticket", type: "TASK" });
    });

    expect(client.getQueryState(FILTERED_COUNTS_KEY)?.isInvalidated).toBe(true);
    expect(client.getQueryState(UNFILTERED_COUNTS_KEY)?.isInvalidated).toBe(true);
  });

  it("a delete mutation invalidates both filtered and unfiltered column-count queries", async () => {
    const { result } = renderHook(() => useDeleteTicket(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 1 });
    });

    expect(client.getQueryState(FILTERED_COUNTS_KEY)?.isInvalidated).toBe(true);
    expect(client.getQueryState(UNFILTERED_COUNTS_KEY)?.isInvalidated).toBe(true);
  });

  it("a title-only mutation does not invalidate column-count queries since columns are not title-dependent", async () => {
    const { result } = renderHook(() => useUpdateTicket(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 1, title: "New title" });
    });

    expect(client.getQueryState(FILTERED_COUNTS_KEY)?.isInvalidated).toBe(false);
    expect(client.getQueryState(UNFILTERED_COUNTS_KEY)?.isInvalidated).toBe(false);
  });

  it("an assignee-only mutation does not invalidate column-count queries since columns are not assignee-dependent", async () => {
    const { result } = renderHook(() => useUpdateTicket(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 1, assigneeId: "user-xyz" });
    });

    expect(client.getQueryState(FILTERED_COUNTS_KEY)?.isInvalidated).toBe(false);
    expect(client.getQueryState(UNFILTERED_COUNTS_KEY)?.isInvalidated).toBe(false);
  });

  it("unfiltered boards receiving a create invalidation behave exactly as before the prefix fix", async () => {
    const { result } = renderHook(() => useCreateTicket(), { wrapper: wrap(client) });

    const unfilteredStateBefore = client.getQueryState(UNFILTERED_COUNTS_KEY);
    expect(unfilteredStateBefore?.isInvalidated).toBe(false);

    await act(async () => {
      await result.current.mutateAsync({ projectId: 42, title: "Another ticket", type: "BUG" });
    });

    expect(client.getQueryState(UNFILTERED_COUNTS_KEY)?.isInvalidated).toBe(true);
  });
});
