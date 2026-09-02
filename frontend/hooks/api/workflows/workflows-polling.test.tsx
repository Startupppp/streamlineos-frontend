import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import type { AccessResponse } from "@/types/access";
import { queryKeys } from "@/lib/query-keys";
import type { WorkflowExecution, ExecutionStatus } from "../workflows-types";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
  }),
}));

const EMPTY_ACCESS: AccessResponse = {
  scopes: {},
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { WORKFLOWS: true },
};

function makeExecution(status: ExecutionStatus): WorkflowExecution {
  return {
    id: "e1",
    workflowId: "w1",
    workflowVersionId: "v1",
    status,
    triggerType: null,
    triggerData: null,
    context: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
    triggeredBy: null,
    createdAt: "2024-01-01T00:00:00Z",
  };
}

function makeExecPage(status: ExecutionStatus) {
  return {
    data: [makeExecution(status)],
    pagination: { limit: 20, nextCursor: null, hasMore: false },
  };
}

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue(EMPTY_ACCESS),
  },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

function makeClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const access: AccessResponse = {
    scopes: { "workflows:executions:view": "all" } as AccessResponse["scopes"],
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: { WORKFLOWS: true },
  };
  client.setQueryData(queryKeys.access.me(), access);
  return client;
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const EXECUTIONS_URL = "/workflows/executions";

function execCallCount() {
  return apiClient.get.mock.calls.filter(
    (c: unknown[]) => c[0] === EXECUTIONS_URL,
  ).length;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Polling enabled for active states ───────────────────────────────────────

describe("useAllExecutions — refetchInterval", () => {
  it("polls again after 10s when an execution has status=running", async () => {
    apiClient.get.mockResolvedValue(makeExecPage("running"));

    const client = makeClient();
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await act(async () => { await Promise.resolve(); });

    const before = execCallCount();
    expect(before).toBeGreaterThan(0);

    await act(async () => {
      jest.advanceTimersByTime(10_500);
      await Promise.resolve();
    });

    expect(execCallCount()).toBeGreaterThan(before);
  });

  it("polls again after 10s when an execution has status=waiting", async () => {
    apiClient.get.mockResolvedValue(makeExecPage("waiting"));

    const client = makeClient();
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await act(async () => { await Promise.resolve(); });

    const before = execCallCount();

    await act(async () => {
      jest.advanceTimersByTime(10_500);
      await Promise.resolve();
    });

    expect(execCallCount()).toBeGreaterThan(before);
  });

// ─── Polling disabled for terminal states ────────────────────────────────────

  it("does not poll after 10s when all executions are completed", async () => {
    apiClient.get.mockResolvedValue(makeExecPage("completed"));

    const client = makeClient();
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await act(async () => { await Promise.resolve(); });

    const before = execCallCount();

    await act(async () => {
      jest.advanceTimersByTime(10_500);
      await Promise.resolve();
    });

    expect(execCallCount()).toBe(before);
  });

  it("does not poll when all executions are failed", async () => {
    apiClient.get.mockResolvedValue(makeExecPage("failed"));

    const client = makeClient();
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await act(async () => { await Promise.resolve(); });

    const before = execCallCount();

    await act(async () => {
      jest.advanceTimersByTime(10_500);
      await Promise.resolve();
    });

    expect(execCallCount()).toBe(before);
  });

  it("does not poll when all executions are cancelled", async () => {
    apiClient.get.mockResolvedValue(makeExecPage("cancelled"));

    const client = makeClient();
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await act(async () => { await Promise.resolve(); });

    const before = execCallCount();

    await act(async () => {
      jest.advanceTimersByTime(10_500);
      await Promise.resolve();
    });

    expect(execCallCount()).toBe(before);
  });

  it("does not poll when all executions are timed_out", async () => {
    apiClient.get.mockResolvedValue(makeExecPage("timed_out"));

    const client = makeClient();
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await act(async () => { await Promise.resolve(); });

    const before = execCallCount();

    await act(async () => {
      jest.advanceTimersByTime(10_500);
      await Promise.resolve();
    });

    expect(execCallCount()).toBe(before);
  });

  it("does not poll when there is no data yet", async () => {
    apiClient.get.mockImplementation(() => new Promise(() => {}));

    const client = makeClient();
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await act(async () => { await Promise.resolve(); });

    const before = execCallCount();

    await act(async () => {
      jest.advanceTimersByTime(10_500);
      await Promise.resolve();
    });

    expect(execCallCount()).toBe(before);
  });

  it("polls while executions are still pending, because the runner has not picked them up yet", async () => {
    apiClient.get.mockResolvedValue(makeExecPage("pending"));

    const client = makeClient();
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await act(async () => { await Promise.resolve(); });

    const before = execCallCount();

    await act(async () => {
      jest.advanceTimersByTime(10_500);
      await Promise.resolve();
    });

    expect(execCallCount()).toBeGreaterThan(before);
  });
});
