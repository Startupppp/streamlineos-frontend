"use client";

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useUpdateTicket } from "./ticket-update-mutation";
import { useCreateTicket, useDeleteTicket, useBulkUpdateTickets } from "./ticket-create-rank-mutations";
import { queryKeys } from "@/lib/query-keys";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ id: 99, title: "New ticket" }),
    patch: jest.fn().mockResolvedValue({ updated: true, updatedAt: "2026-09-15T10:01:00.000Z" }),
    delete: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: { isOrgOwner: false, scopes: { "build:tickets:create": "all", "build:tickets:delete": "all" }, modules: {} },
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

describe("useCreateTicket — invalidation contract", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates tickets list for the project", async () => {
    const { result } = renderHook(() => useCreateTicket(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 42, title: "T", type: "FEATURE" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.projects.tickets({ projectId: 42 })),
    );
  });

  it("invalidates columnCounts for the project", async () => {
    const { result } = renderHook(() => useCreateTicket(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 7, title: "T", type: "BUG" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.projects.columnCounts(7)),
    );
  });

  it("invalidates dashboard.myIssues() so the current user's work list refreshes", async () => {
    const { result } = renderHook(() => useCreateTicket(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 5, title: "T", type: "FEATURE" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.dashboard.myIssues()),
    );
  });
});

describe("useDeleteTicket — invalidation contract", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates tickets list for the project", async () => {
    const { result } = renderHook(() => useDeleteTicket(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 1 });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.projects.tickets({ projectId: 42 })),
    );
  });

  it("invalidates cycles so cycle ticket counts update", async () => {
    const { result } = renderHook(() => useDeleteTicket(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 3 });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.projects.cycles(42)),
    );
  });

  it("invalidates dashboard.myIssues() so the deleted ticket disappears", async () => {
    const { result } = renderHook(() => useDeleteTicket(10), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 55 });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.dashboard.myIssues()),
    );
  });
});

describe("useUpdateTicket — invalidation contract", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("keeps the optimistic ticket cache and refreshes activity without a detail refetch", async () => {
    client.setQueryData(queryKeys.projects.ticket(9), {
      id: 9,
      title: "Before",
      updatedAt: "2026-09-15T10:00:00.000Z",
    });
    const { result } = renderHook(() => useUpdateTicket(42), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 9, title: "After" });
    });

    expect(client.getQueryData(queryKeys.projects.ticket(9))).toMatchObject({
      title: "After",
      updatedAt: "2026-09-15T10:01:00.000Z",
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.projects.ticket(9) }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.ticketActivity.list(9),
      exact: true,
    });
  });

  it("refreshes planning aggregates only for planning field changes", async () => {
    const { result } = renderHook(() => useUpdateTicket(42), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 9, cycleId: 3 });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.projects.cycles(42),
      refetchType: "none",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.projects.columnCounts(42),
      refetchType: "none",
    });
  });

  it("marks every project ticket list stale without refetching loaded pages", async () => {
    const { result } = renderHook(() => useUpdateTicket(42), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 9, title: "After" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.projects.tickets({ projectId: 42 }),
      refetchType: "none",
    });
  });
});

describe("useBulkUpdateTickets — invalidation contract", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates projectReports.all so cycle burndown reflects bulk status/cycle changes", async () => {
    const { result } = renderHook(() => useBulkUpdateTickets(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketIds: [1, 2], status: "DONE" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.projectReports.all),
    );
  });

  it("invalidates dashboard.myIssues() so My Issues widget reflects bulk assignee/status changes", async () => {
    const { result } = renderHook(() => useBulkUpdateTickets(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketIds: [1, 2], assigneeId: "user-abc" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.dashboard.myIssues()),
    );
  });
});
