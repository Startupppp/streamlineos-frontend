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

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: [], pagination: { limit: 20, nextCursor: null, hasMore: false } }),
    post: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock; post: jest.Mock; delete: jest.Mock };
};

const ORG_ID = "org-1";
const USER_ID = "user-1";

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

beforeEach(() => jest.clearAllMocks());

describe("useWorkflows — permission gate", () => {
  it("does not fire the API call when workflows:workflows:view is absent", async () => {
    const client = makeClient([]);
    const { useWorkflows } = await import("../workflows-definitions");
    const { result } = renderHook(() => useWorkflows(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("fires the API call when workflows:workflows:view is granted", async () => {
    const client = makeClient(["workflows:workflows:view"]);
    const { useWorkflows } = await import("../workflows-definitions");
    renderHook(() => useWorkflows(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows", undefined));
  });

  it("org owner always fires the call regardless of explicit grants", async () => {
    const client = makeClient([], true);
    const { useWorkflows } = await import("../workflows-definitions");
    renderHook(() => useWorkflows(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
  });
});

describe("useAllExecutions — permission gate", () => {
  it("does not fire the API call when workflows:executions:view is absent", async () => {
    const client = makeClient([]);
    const { useAllExecutions } = await import("../workflows-executions");
    const { result } = renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("fires the API call when workflows:executions:view is granted", async () => {
    const client = makeClient(["workflows:executions:view"]);
    const { useAllExecutions } = await import("../workflows-executions");
    renderHook(() => useAllExecutions(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows/executions", undefined));
  });
});

describe("useGlobalSecrets — permission gate", () => {
  it("does not fire when workflows:secrets:manage is absent", async () => {
    const client = makeClient(["workflows:workflows:view"]);
    const { useGlobalSecrets } = await import("../workflows-secrets");
    const { result } = renderHook(() => useGlobalSecrets(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("fires when workflows:secrets:manage is granted", async () => {
    const client = makeClient(["workflows:secrets:manage"]);
    const { useGlobalSecrets } = await import("../workflows-secrets");
    renderHook(() => useGlobalSecrets(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/workflows/secrets"));
  });
});

describe("useGlobalVariables — permission gate", () => {
  it("does not fire when workflows:variables:manage is absent", async () => {
    const client = makeClient([]);
    const { useGlobalVariables } = await import("../workflows-variables");
    const { result } = renderHook(() => useGlobalVariables(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});

describe("usePendingApprovals — permission gate", () => {
  it("does not fire when workflows:approvals:view is absent", async () => {
    const client = makeClient([]);
    const { usePendingApprovals } = await import("../workflows-approvals");
    const { result } = renderHook(() => usePendingApprovals(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});

describe("useAllSchedules — permission gate", () => {
  it("does not fire when workflows:schedules:manage is absent", async () => {
    const client = makeClient(["workflows:workflows:view"]);
    const { useAllSchedules } = await import("../workflows-schedules");
    const { result } = renderHook(() => useAllSchedules(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});

describe("useWorkflowAnalytics — permission gate", () => {
  it("does not fire when workflows:analytics:view is absent", async () => {
    const client = makeClient([]);
    const { useWorkflowAnalytics } = await import("../workflows-analytics");
    const { result } = renderHook(() => useWorkflowAnalytics(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});

describe("cursor pagination contract", () => {
  it("useWorkflows passes cursor param to API when supplied", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: [],
      pagination: { limit: 20, nextCursor: "cursor_abc", hasMore: true },
    });
    const client = makeClient(["workflows:workflows:view"]);
    const { useWorkflows } = await import("../workflows-definitions");
    renderHook(() => useWorkflows({ cursor: "prev_cursor", limit: 20 }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith("/workflows", { cursor: "prev_cursor", limit: 20 }),
    );
  });

  it("nextCursor is null (not undefined) on the last page", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });
    const client = makeClient(["workflows:workflows:view"]);
    const { useWorkflows } = await import("../workflows-definitions");
    const { result } = renderHook(() => useWorkflows(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pagination.nextCursor).toBeNull();
    expect(result.current.data?.pagination.nextCursor).not.toBeUndefined();
  });
});
