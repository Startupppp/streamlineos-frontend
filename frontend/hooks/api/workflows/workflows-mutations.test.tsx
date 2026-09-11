import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import type { AccessResponse } from "@/types/access";
import { queryKeys } from "@/lib/query-keys";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
  }),
}));

const WORKFLOW_STUB = {
  id: "w1",
  name: "Test Workflow",
  description: null,
  status: "draft" as const,
  version: 1,
  createdBy: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const EMPTY_LIST = {
  data: [],
  pagination: { limit: 20, nextCursor: null, hasMore: false },
};

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue(EMPTY_LIST),
    post: jest.fn().mockResolvedValue(WORKFLOW_STUB),
    patch: jest.fn().mockResolvedValue(WORKFLOW_STUB),
    delete: jest.fn().mockResolvedValue({ success: true }),
  },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };
};

function makeClient(permissions: string[], isOrgOwner = false): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const access: AccessResponse = {
    scopes: Object.fromEntries(
      permissions.map((k) => [k, "all"]),
    ) as AccessResponse["scopes"],
    isOrgOwner,
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

beforeEach(() => jest.clearAllMocks());

// ─── 1. Version conflict ──────────────────────────────────────────────────────

describe("usePublishWorkflow — version conflict", () => {
  it("surfaces a 409 error to the caller rather than swallowing it", async () => {
    const conflictErr = Object.assign(new Error("Version conflict"), { status: 409 });
    apiClient.post.mockRejectedValueOnce(conflictErr);

    const client = makeClient(["workflows:workflows:publish"]);
    const { usePublishWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => usePublishWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ id: "w1", definitionJson: { nodes: [] }, expectedVersion: 2 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const err = result.current.error as Error & { status?: number };
    expect(err.status).toBe(409);
  });

  it("includes expectedVersion in the publish request body", async () => {
    apiClient.post.mockResolvedValueOnce({
      id: "v3",
      workflowId: "w1",
      version: 3,
      definitionJson: {},
      publishedBy: null,
      publishedAt: null,
      createdAt: "2024-01-01T00:00:00Z",
    });

    const client = makeClient(["workflows:workflows:publish"]);
    const { usePublishWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => usePublishWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ id: "w1", definitionJson: { nodes: [] }, expectedVersion: 2 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith(
      "/workflows/w1/publish",
      { definitionJson: { nodes: [] }, expectedVersion: 2 },
      undefined,
      expect.any(Function),
    );
  });

  it("invalidates queryKeys.workflows.all on successful publish so active list queries re-fetch", async () => {
    const viewAccess: AccessResponse = {
      scopes: {
        "workflows:workflows:view": "all",
        "workflows:workflows:publish": "all",
      } as AccessResponse["scopes"],
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      modules: { WORKFLOWS: true },
    };
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(queryKeys.access.me(), viewAccess);

    const { useWorkflows, usePublishWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(
      () => ({ list: useWorkflows(), publish: usePublishWorkflow() }),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    const listCallsBefore = apiClient.get.mock.calls.filter(
      (c: unknown[]) => c[0] === "/workflows",
    ).length;

    apiClient.post.mockResolvedValueOnce({
      id: "v3",
      workflowId: "w1",
      version: 3,
      definitionJson: {},
      publishedBy: null,
      publishedAt: null,
      createdAt: "2024-01-01T00:00:00Z",
    });

    await act(async () => {
      result.current.publish.mutate({ id: "w1", definitionJson: {} });
    });

    await waitFor(() => expect(result.current.publish.isSuccess).toBe(true));
    await waitFor(() =>
      expect(
        apiClient.get.mock.calls.filter((c: unknown[]) => c[0] === "/workflows").length,
      ).toBeGreaterThan(listCallsBefore),
    );
  });
});

// ─── 2. Permission gates — definition mutations ───────────────────────────────

describe("mutation permission gates — workflow definitions", () => {
  it("useCreateWorkflow refuses when workflows:workflows:create is absent", async () => {
    const client = makeClient([]);
    const { useCreateWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => useCreateWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => { result.current.mutate({ name: "New" }); });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/missing permission.*workflows:workflows:create/i);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("useCreateWorkflow proceeds and calls the API when workflows:workflows:create is granted", async () => {
    const client = makeClient(["workflows:workflows:create"]);
    const { useCreateWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => useCreateWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => { result.current.mutate({ name: "New" }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith(
      "/workflows",
      { name: "New" },
      undefined,
      expect.any(Function),
    );
  });

  it("useUpdateWorkflow refuses when workflows:workflows:update is absent", async () => {
    const client = makeClient([]);
    const { useUpdateWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => useUpdateWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ id: "w1", name: "Renamed" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/missing permission.*workflows:workflows:update/i);
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("useUpdateWorkflow proceeds and calls the API when workflows:workflows:update is granted", async () => {
    const client = makeClient(["workflows:workflows:update"]);
    const { useUpdateWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => useUpdateWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ id: "w1", name: "Renamed" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/workflows/w1",
      { name: "Renamed" },
      undefined,
      expect.any(Function),
    );
  });

  it("useDeleteWorkflow refuses when workflows:workflows:delete is absent", async () => {
    const client = makeClient([]);
    const { useDeleteWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => useDeleteWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => { result.current.mutate("w1"); });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/missing permission.*workflows:workflows:delete/i);
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it("useDeleteWorkflow proceeds and calls the API when workflows:workflows:delete is granted", async () => {
    const client = makeClient(["workflows:workflows:delete"]);
    const { useDeleteWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => useDeleteWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => { result.current.mutate("w1"); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/workflows/w1",
      undefined,
      undefined,
      expect.any(Function),
    );
  });

  it("usePublishWorkflow refuses when workflows:workflows:publish is absent", async () => {
    const client = makeClient([]);
    const { usePublishWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => usePublishWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ id: "w1", definitionJson: {} });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/missing permission.*workflows:workflows:publish/i);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("usePublishWorkflow proceeds and calls the API when workflows:workflows:publish is granted", async () => {
    apiClient.post.mockResolvedValueOnce({
      id: "v2",
      workflowId: "w1",
      version: 2,
      definitionJson: {},
      publishedBy: null,
      publishedAt: null,
      createdAt: "2024-01-01T00:00:00Z",
    });

    const client = makeClient(["workflows:workflows:publish"]);
    const { usePublishWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(() => usePublishWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ id: "w1", definitionJson: {} });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith(
      "/workflows/w1/publish",
      { definitionJson: {} },
      undefined,
      expect.any(Function),
    );
  });
});

// ─── 3. Permission gates — execution mutations ────────────────────────────────

describe("mutation permission gates — executions", () => {
  it("useTriggerWorkflow refuses when workflows:executions:manage is absent", async () => {
    const client = makeClient([]);
    const { useTriggerWorkflow } = await import("../workflows-executions");
    const { result } = renderHook(() => useTriggerWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => { result.current.mutate({ id: "w1" }); });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/missing permission.*workflows:executions:manage/i);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("useTriggerWorkflow proceeds and calls the API when workflows:executions:manage is granted", async () => {
    const execStub = {
      id: "e1",
      workflowId: "w1",
      workflowVersionId: "v1",
      status: "pending",
      triggerType: "manual",
      triggerData: null,
      context: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      triggeredBy: null,
      createdAt: "2024-01-01T00:00:00Z",
    };
    apiClient.post.mockResolvedValueOnce(execStub);

    const client = makeClient(["workflows:executions:manage"]);
    const { useTriggerWorkflow } = await import("../workflows-executions");
    const { result } = renderHook(() => useTriggerWorkflow(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => { result.current.mutate({ id: "w1" }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith(
      "/workflows/w1/trigger",
      undefined,
      undefined,
      expect.any(Function),
    );
  });

  it("useCancelExecution refuses when workflows:executions:manage is absent", async () => {
    const client = makeClient([]);
    const { useCancelExecution } = await import("../workflows-executions");
    const { result } = renderHook(() => useCancelExecution(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ workflowId: "w1", executionId: "e1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/missing permission.*workflows:executions:manage/i);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("useCancelExecution proceeds and calls the API when workflows:executions:manage is granted", async () => {
    const cancelledStub = {
      id: "e1",
      workflowId: "w1",
      workflowVersionId: "v1",
      status: "cancelled",
      triggerType: null,
      triggerData: null,
      context: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      triggeredBy: null,
      createdAt: "2024-01-01T00:00:00Z",
    };
    apiClient.post.mockResolvedValueOnce(cancelledStub);

    const client = makeClient(["workflows:executions:manage"]);
    const { useCancelExecution } = await import("../workflows-executions");
    const { result } = renderHook(() => useCancelExecution(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate({ workflowId: "w1", executionId: "e1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith(
      "/workflows/w1/executions/e1/cancel",
      undefined,
      undefined,
      expect.any(Function),
    );
  });
});

// ─── 4. Query-key discipline ──────────────────────────────────────────────────

describe("query-key discipline", () => {
  it("queryKeys.workflows.all is a prefix of queryKeys.workflows.list so invalidation covers list reads", () => {
    const all = [...queryKeys.workflows.all];
    const list = [...queryKeys.workflows.list()];
    expect(list.slice(0, all.length)).toEqual(all);
  });

  it("queryKeys.workflows.all is a prefix of queryKeys.workflows.detail so invalidation covers detail reads", () => {
    const all = [...queryKeys.workflows.all];
    const detail = [...queryKeys.workflows.detail("w1")];
    expect(detail.slice(0, all.length)).toEqual(all);
  });

  it("queryKeys.workflows.all is a prefix of queryKeys.workflows.executions so invalidation covers execution reads", () => {
    const all = [...queryKeys.workflows.all];
    const executions = [...queryKeys.workflows.executions("w1")];
    expect(executions.slice(0, all.length)).toEqual(all);
  });

  it("successful useCreateWorkflow invalidates list queries via the workflows.all prefix", async () => {
    const viewAndCreateAccess: AccessResponse = {
      scopes: {
        "workflows:workflows:view": "all",
        "workflows:workflows:create": "all",
      } as AccessResponse["scopes"],
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      modules: { WORKFLOWS: true },
    };
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(queryKeys.access.me(), viewAndCreateAccess);

    const { useWorkflows, useCreateWorkflow } = await import("../workflows-definitions");
    const { result } = renderHook(
      () => ({ list: useWorkflows(), create: useCreateWorkflow() }),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    const listCallsBefore = apiClient.get.mock.calls.filter(
      (c: unknown[]) => c[0] === "/workflows",
    ).length;

    await act(async () => { result.current.create.mutate({ name: "New" }); });

    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    await waitFor(() =>
      expect(
        apiClient.get.mock.calls.filter((c: unknown[]) => c[0] === "/workflows").length,
      ).toBeGreaterThan(listCallsBefore),
    );
  });
});
