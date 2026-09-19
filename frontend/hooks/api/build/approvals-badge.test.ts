import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useBuildNotificationUnreadCount, useDecideApproval, useDeleteApproval } from "./approvals";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ count: 3 }),
    patch: jest.fn().mockResolvedValue({
      id: 1,
      orgId: "org-1",
      projectId: 42,
      entityType: "task",
      entityId: 10,
      title: "Approve deploy",
      reason: null,
      requestedById: null,
      approverMembershipId: null,
      status: "approved",
      level: 1,
      dueAt: null,
      decisionComment: null,
      decidedAt: "2026-09-19T10:00:00.000Z",
      createdBy: null,
      deletedAt: null,
      createdAt: "2026-09-18T08:00:00.000Z",
      updatedAt: "2026-09-19T10:00:00.000Z",
    }),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockUseCan = jest.fn<boolean, [string]>().mockReturnValue(true);

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: {
      isOrgOwner: false,
      scopes: {
        "build:tickets:view": "all",
        "build:approvals:view": "all",
        "build:approvals:decide": "all",
        "build:approvals:manage": "all",
      },
      modules: {},
    },
    refetch: jest.fn().mockResolvedValue({
      data: {
        isOrgOwner: false,
        scopes: {
          "build:tickets:view": "all",
          "build:approvals:view": "all",
          "build:approvals:decide": "all",
          "build:approvals:manage": "all",
        },
      },
    }),
  })),
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: () => unknown) => fn,
}));

jest.mock("@/hooks/api/build/approvals-schema", () => ({
  approvalInboxListContract: { parse: (v: unknown) => v },
  approvalRowContract: { parse: (v: unknown) => v },
}));

jest.mock("@/hooks/api/notifications-schema", () => ({
  notificationCountContract: { parse: (v: unknown) => v },
}));

jest.mock("@/hooks/api/cursor-page-schema", () => ({
  noContentContract: { parse: (v: unknown) => v },
}));

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("useBuildNotificationUnreadCount — badge permission gate", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCan.mockReturnValue(true);
    client = makeClient();
  });

  it("returns build notification count when build:tickets:view is held", () => {
    mockUseCan.mockImplementation((key) => key === "build:tickets:view");
    client.setQueryData(
      platformCoreQueryKeys.notifications.unreadCount("build"),
      { count: 5 },
    );
    const { result } = renderHook(() => useBuildNotificationUnreadCount(), {
      wrapper: wrap(client),
    });
    expect(result.current.data).toEqual({ count: 5 });
  });

  it("returns undefined when build:tickets:view is not held so stale count does not persist in the badge", () => {
    client.setQueryData(
      platformCoreQueryKeys.notifications.unreadCount("build"),
      { count: 5 },
    );
    mockUseCan.mockReturnValue(false);
    const { result } = renderHook(() => useBuildNotificationUnreadCount(), {
      wrapper: wrap(client),
    });
    expect(result.current.data).toBeUndefined();
  });
});

describe("useDecideApproval — BSN-03-024 cache-patch approach", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCan.mockReturnValue(true);
    client = makeClient();
    client.setQueryData(buildWorkQueryKeys.projects.approvals.inboxCount(), {
      count: 3,
    });
    client.setQueryData(buildWorkQueryKeys.projects.approvals.inbox(), [
      { id: 1, projectId: 42, projectName: "P", projectKey: "P", entityType: "task", entityId: 10, title: "A", status: "pending", level: 1, dueAt: null, requestedById: null, decidedAt: null },
      { id: 2, projectId: 42, projectName: "P", projectKey: "P", entityType: "task", entityId: 11, title: "B", status: "pending", level: 1, dueAt: null, requestedById: null, decidedAt: null },
    ]);
  });

  it("decrements the inbox count in cache without a network round-trip on the count key", async () => {
    const { result } = renderHook(() => useDecideApproval(42), {
      wrapper: wrap(client),
    });
    await act(async () => {
      await result.current.mutateAsync({
        approvalId: 1,
        decision: "approved",
      });
    });
    const count = client.getQueryData<{ count: number }>(
      buildWorkQueryKeys.projects.approvals.inboxCount(),
    );
    expect(count).toEqual({ count: 2 });
  });

  it("removes the decided approval from the inbox list cache", async () => {
    const { result } = renderHook(() => useDecideApproval(42), {
      wrapper: wrap(client),
    });
    await act(async () => {
      await result.current.mutateAsync({
        approvalId: 1,
        decision: "approved",
      });
    });
    const list = client.getQueryData<{ id: number }[]>(
      buildWorkQueryKeys.projects.approvals.inbox(),
    );
    expect(list?.map((i) => i.id)).toEqual([2]);
  });

  it("does not invalidate the inbox prefix — acting on last item patches, not refetches", async () => {
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDecideApproval(42), {
      wrapper: wrap(client),
    });
    await act(async () => {
      await result.current.mutateAsync({
        approvalId: 1,
        decision: "approved",
      });
    });
    const calledWithInboxPrefix = invalidateSpy.mock.calls.some((call) => {
      const key = (call[0] as { queryKey?: unknown[] }).queryKey;
      return (
        Array.isArray(key) &&
        key.join(",") ===
          buildWorkQueryKeys.projects.approvals.inbox().join(",")
      );
    });
    expect(calledWithInboxPrefix).toBe(false);
  });

  it("clamps inbox count to zero when acting on the last pending item", async () => {
    client.setQueryData(buildWorkQueryKeys.projects.approvals.inboxCount(), {
      count: 1,
    });
    const { result } = renderHook(() => useDecideApproval(42), {
      wrapper: wrap(client),
    });
    await act(async () => {
      await result.current.mutateAsync({
        approvalId: 1,
        decision: "approved",
      });
    });
    const count = client.getQueryData<{ count: number }>(
      buildWorkQueryKeys.projects.approvals.inboxCount(),
    );
    expect(count).toEqual({ count: 0 });
  });
});

describe("useDeleteApproval — BSN-03-024 cache-patch on delete", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCan.mockReturnValue(true);
    client = makeClient();
    client.setQueryData(buildWorkQueryKeys.projects.approvals.inboxCount(), {
      count: 2,
    });
    client.setQueryData(buildWorkQueryKeys.projects.approvals.inbox(), [
      { id: 10, projectId: 42, projectName: "P", projectKey: "P", entityType: "task", entityId: 1, title: "X", status: "pending", level: 1, dueAt: null, requestedById: null, decidedAt: null },
      { id: 11, projectId: 42, projectName: "P", projectKey: "P", entityType: "task", entityId: 2, title: "Y", status: "pending", level: 1, dueAt: null, requestedById: null, decidedAt: null },
    ]);
  });

  it("decrements inbox count and removes the deleted approval from the inbox list", async () => {
    const { result } = renderHook(() => useDeleteApproval(42), {
      wrapper: wrap(client),
    });
    await act(async () => {
      await result.current.mutateAsync(10);
    });
    const count = client.getQueryData<{ count: number }>(
      buildWorkQueryKeys.projects.approvals.inboxCount(),
    );
    const list = client.getQueryData<{ id: number }[]>(
      buildWorkQueryKeys.projects.approvals.inbox(),
    );
    expect(count).toEqual({ count: 1 });
    expect(list?.map((i) => i.id)).toEqual([11]);
  });
});
