"use client";

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useCreateTicket, useDeleteTicket, useBulkUpdateTickets } from "./ticket-mutations";
import { useUpdateSprint } from "./sprints";
import { queryKeys } from "@/lib/query-keys";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ id: 99, title: "New ticket" }),
    patch: jest.fn().mockResolvedValue({ success: true }),
    delete: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: { isOrgOwner: false, scopes: { "build:tickets:create": "all", "build:tickets:delete": "all", "build:sprints:manage": "all" }, modules: {} },
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

  it("invalidates sprints so sprint ticket counts update", async () => {
    const { result } = renderHook(() => useDeleteTicket(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: 3 });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.projects.sprints(42)),
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

describe("useBulkUpdateTickets — invalidation contract", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates projectReports.all so sprint burndown reflects bulk status/sprint changes", async () => {
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

describe("useUpdateSprint — invalidation contract", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the sprints list for the project after update", async () => {
    const { result } = renderHook(() => useUpdateSprint(42), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ sprintId: 7, name: "Sprint 2" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).toContain(
      JSON.stringify(queryKeys.projects.sprints(42)),
    );
  });
});
