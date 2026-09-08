import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import type { AccessResponse } from "@/types/access";
import { queryKeys } from "@/lib/query-keys";

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

const EMPTY_LIST = { data: [], pagination: { limit: 20, nextCursor: null, hasMore: false } };

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockImplementation((url: string) =>
      Promise.resolve(url === "/me/access" ? EMPTY_ACCESS : EMPTY_LIST),
    ),
    post: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock; post: jest.Mock; delete: jest.Mock };
};

function makeClient(permissions: string[], isOrgOwner = false): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const access: AccessResponse = {
    scopes: Object.fromEntries(permissions.map((k) => [k, "all"])) as AccessResponse["scopes"],
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

function routesRequested(): string[] {
  return apiClient.get.mock.calls.map((call) => String(call[0]));
}

beforeEach(() => jest.clearAllMocks());

describe("useWorkflows — permission gate", () => {
  it("does not fire the API call when workflows:workflows:view is absent", async () => {
    const client = makeClient([]);
    const { useWorkflows } = await import("../workflows-definitions");
    const { result } = renderHook(() => useWorkflows(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(routesRequested()).not.toContain("/workflows");
    expect(result.current.data).toBeUndefined();
  });

  it("fires the API call when workflows:workflows:view is granted", async () => {
    const client = makeClient(["workflows:workflows:view"]);
    const { useWorkflows } = await import("../workflows-definitions");
    renderHook(() => useWorkflows(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows", undefined, expect.any(AbortSignal), expect.any(Function)));
  });

  it("org owner always fires the call regardless of explicit grants", async () => {
    const client = makeClient([], true);
    const { useWorkflows } = await import("../workflows-definitions");
    renderHook(() => useWorkflows(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows", undefined, expect.any(AbortSignal), expect.any(Function)));
  });
});

describe("useAllExecutions — permission gate", () => {
  it("does not fire the API call when workflows:executions:view is absent", async () => {
    const client = makeClient([]);
    const { useAllExecutions } = await import("../workflows-executions");
    const { result } = renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(routesRequested()).not.toContain("/workflows/executions");
  });

  it("fires the API call when workflows:executions:view is granted", async () => {
    const client = makeClient(["workflows:executions:view"]);
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows/executions", undefined, expect.any(AbortSignal), expect.any(Function)));
  });
});

describe("useGlobalSecrets — permission gate", () => {
  it("does not fire when workflows:secrets:manage is absent", async () => {
    const client = makeClient(["workflows:workflows:view"]);
    const { useGlobalSecrets } = await import("../workflows-secrets");
    const { result } = renderHook(() => useGlobalSecrets(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(routesRequested()).not.toContain("/workflows/secrets");
  });

  it("fires when workflows:secrets:manage is granted", async () => {
    const client = makeClient(["workflows:secrets:manage"]);
    const { useGlobalSecrets } = await import("../workflows-secrets");
    renderHook(() => useGlobalSecrets(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows/secrets", undefined, expect.any(AbortSignal), expect.any(Function)));
  });
});

describe("useGlobalVariables — permission gate", () => {
  it("does not fire when workflows:variables:manage is absent", async () => {
    const client = makeClient([]);
    const { useGlobalVariables } = await import("../workflows-variables");
    const { result } = renderHook(() => useGlobalVariables(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(routesRequested()).not.toContain("/workflows/variables");
  });

  it("fires when workflows:variables:manage is granted", async () => {
    const client = makeClient(["workflows:variables:manage"]);
    const { useGlobalVariables } = await import("../workflows-variables");
    renderHook(() => useGlobalVariables(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows/variables", undefined, expect.any(AbortSignal), expect.any(Function)));
  });
});

describe("usePendingApprovals — permission gate", () => {
  it("does not fire when workflows:approvals:view is absent", async () => {
    const client = makeClient([]);
    const { usePendingApprovals } = await import("../workflows-approvals");
    const { result } = renderHook(() => usePendingApprovals(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(routesRequested()).not.toContain("/workflows/approvals/pending");
  });

  it("fires when workflows:approvals:view is granted", async () => {
    const client = makeClient(["workflows:approvals:view"]);
    const { usePendingApprovals } = await import("../workflows-approvals");
    renderHook(() => usePendingApprovals(), { wrapper: makeWrapper(client) });

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith("/workflows/approvals/pending", undefined, expect.any(AbortSignal), expect.any(Function)),
    );
  });
});

describe("useAllSchedules — permission gate", () => {
  it("does not fire when workflows:schedules:manage is absent", async () => {
    const client = makeClient(["workflows:workflows:view"]);
    const { useAllSchedules } = await import("../workflows-schedules");
    const { result } = renderHook(() => useAllSchedules(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(routesRequested()).not.toContain("/workflows/schedules");
  });

  it("fires when workflows:schedules:manage is granted", async () => {
    const client = makeClient(["workflows:schedules:manage"]);
    const { useAllSchedules } = await import("../workflows-schedules");
    renderHook(() => useAllSchedules(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows/schedules", undefined, expect.any(AbortSignal), expect.any(Function)));
  });
});

describe("useWorkflowAnalytics — permission gate", () => {
  it("does not fire when workflows:analytics:view is absent", async () => {
    const client = makeClient([]);
    const { useWorkflowAnalytics } = await import("../workflows-analytics");
    const { result } = renderHook(() => useWorkflowAnalytics(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(routesRequested()).not.toContain("/workflows/analytics");
  });

  it("fires when workflows:analytics:view is granted", async () => {
    const client = makeClient(["workflows:analytics:view"]);
    const { useWorkflowAnalytics } = await import("../workflows-analytics");
    renderHook(() => useWorkflowAnalytics(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows/analytics", undefined, expect.any(AbortSignal), expect.any(Function)));
  });
});

describe("useWorkflowTemplates — permission gate", () => {
  it("does not fire when workflows:templates:view is absent", async () => {
    const client = makeClient([]);
    const { useWorkflowTemplates } = await import("../workflows-analytics");
    const { result } = renderHook(() => useWorkflowTemplates(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(routesRequested()).not.toContain("/workflows/templates");
  });

  it("fires when workflows:templates:view is granted", async () => {
    const client = makeClient(["workflows:templates:view"]);
    const { useWorkflowTemplates } = await import("../workflows-analytics");
    renderHook(() => useWorkflowTemplates(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows/templates", undefined, expect.any(AbortSignal), expect.any(Function)));
  });
});

describe("cursor pagination contract", () => {
  it("useWorkflows passes cursor param to API when supplied", async () => {
    apiClient.get.mockImplementationOnce((url: string) =>
      Promise.resolve(
        url === "/me/access"
          ? EMPTY_ACCESS
          : { data: [], pagination: { limit: 20, nextCursor: "cursor_abc", hasMore: true } },
      ),
    );
    const client = makeClient(["workflows:workflows:view"]);
    const { useWorkflows } = await import("../workflows-definitions");
    renderHook(() => useWorkflows({ cursor: "prev_cursor", limit: 20 }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith("/workflows", { cursor: "prev_cursor", limit: 20 }, expect.any(AbortSignal), expect.any(Function)),
    );
  });

  it("nextCursor is null (not undefined) on the last page", async () => {
    apiClient.get.mockImplementationOnce((url: string) =>
      Promise.resolve(
        url === "/me/access"
          ? EMPTY_ACCESS
          : { data: [], pagination: { limit: 20, nextCursor: null, hasMore: false } },
      ),
    );
    const client = makeClient(["workflows:workflows:view"]);
    const { useWorkflows } = await import("../workflows-definitions");
    const { result } = renderHook(() => useWorkflows(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pagination.nextCursor).toBeNull();
    expect(result.current.data?.pagination.nextCursor).not.toBeUndefined();
  });
});
