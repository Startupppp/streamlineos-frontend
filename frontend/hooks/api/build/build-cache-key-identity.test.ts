import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { usePmWorkspaces, useUpdatePmWorkspace } from "@/hooks/api/build/pm-workspaces";
import { useManagedProducts, useUpdateManagedProduct } from "@/hooks/api/build/managed-products";
import { useAgentPulse } from "@/hooks/api/build/agent-pulse";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: {
      isOrgOwner: false,
      scopes: {
        "build:workspaces:update": "all",
        "build:workspaces:delete": "all",
        "build:managed-products:update": "all",
        "build:approvals:view": "all",
      },
    },
    refetch: jest.fn().mockResolvedValue({
      data: { isOrgOwner: false, scopes: {}, modules: {} },
    }),
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue(null),
    patch: jest.fn().mockResolvedValue({ id: 1, name: "Updated" }),
    delete: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: () => unknown) => fn,
}));

jest.mock("@/hooks/api/build/pm-workspaces-schema", () => ({
  pmWorkspacePageContract: null,
  pmWorkspaceRowContract: null,
  pmWorkspaceMemberPageContract: null,
  pmWorkspaceMemberRowContract: null,
  pmWorkspacesSuccessContract: null,
}));

jest.mock("@/hooks/api/build/managed-products-schema", () => ({
  managedProductPageContract: null,
  managedProductRowContract: null,
}));

jest.mock("@/hooks/api/cursor-page-schema", () => ({
  noContentContract: null,
}));

jest.mock("@/hooks/api/build/agent-pulse-schema", () => ({
  agentPulseContract: null,
}));

type ApiMock = { get: jest.Mock; patch: jest.Mock; delete: jest.Mock };

function getApiClient(): ApiMock {
  return (
    jest.requireMock("@/lib/api-client") as { apiClient: ApiMock }
  ).apiClient;
}

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

describe("BSN-04-031 — all response-shaping inputs appear in cache keys", () => {
  it("pm-workspace list key with limit differs from key with no params", () => {
    const withLimit = buildWorkQueryKeys.projects.pmWorkspaces.list({ limit: "100" });
    const noParams = buildWorkQueryKeys.projects.pmWorkspaces.list();
    expect(JSON.stringify(withLimit)).not.toEqual(JSON.stringify(noParams));
  });

  it("pm-workspace list key with search differs from key without search", () => {
    const withSearch = buildWorkQueryKeys.projects.pmWorkspaces.list({ search: "Acme" });
    const noSearch = buildWorkQueryKeys.projects.pmWorkspaces.list();
    expect(JSON.stringify(withSearch)).not.toEqual(JSON.stringify(noSearch));
  });

  it("pm-workspace list key with status differs from key without status", () => {
    const withStatus = buildWorkQueryKeys.projects.pmWorkspaces.list({ status: "archived" });
    const noStatus = buildWorkQueryKeys.projects.pmWorkspaces.list();
    expect(JSON.stringify(withStatus)).not.toEqual(JSON.stringify(noStatus));
  });

  it("managed-products list key with pmWorkspaceId differs from key without", () => {
    const withWs = buildWorkQueryKeys.projects.managedProducts.list({ pmWorkspaceId: "ws-1" });
    const noWs = buildWorkQueryKeys.projects.managedProducts.list();
    expect(JSON.stringify(withWs)).not.toEqual(JSON.stringify(noWs));
  });

  it("scope-directory resolve key sorts input so callers with different orderings share one cache entry", () => {
    const ab = buildWorkQueryKeys.projects.scopeDirectory.resolve(["project:1", "workspace:2"]);
    const ba = buildWorkQueryKeys.projects.scopeDirectory.resolve(["workspace:2", "project:1"]);
    expect(JSON.stringify(ab)).toEqual(JSON.stringify(ba));
  });

  it("agent-pulse key is stable with no shaping parameters because it returns one computed top signal", () => {
    const k1 = buildWorkQueryKeys.projects.agentPulse();
    const k2 = buildWorkQueryKeys.projects.agentPulse();
    expect(JSON.stringify(k1)).toEqual(JSON.stringify(k2));
  });
});

describe("BSN-04-032 — queryFns pass the AbortSignal to apiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiClient().get.mockResolvedValue(null);
  });

  it("usePmWorkspaces delivers the React Query abort signal as the third argument to apiClient.get", async () => {
    const client = makeClient();
    renderHook(() => usePmWorkspaces({ limit: 10 }), { wrapper: wrap(client) });
    await waitFor(() => expect(getApiClient().get).toHaveBeenCalled());
    const thirdArg: unknown = getApiClient().get.mock.calls[0]?.[2];
    expect(thirdArg).toBeInstanceOf(AbortSignal);
  });

  it("useManagedProducts delivers the React Query abort signal as the third argument to apiClient.get", async () => {
    const client = makeClient();
    renderHook(() => useManagedProducts({ limit: 10 }), { wrapper: wrap(client) });
    await waitFor(() => expect(getApiClient().get).toHaveBeenCalled());
    const thirdArg: unknown = getApiClient().get.mock.calls[0]?.[2];
    expect(thirdArg).toBeInstanceOf(AbortSignal);
  });

  it("useAgentPulse delivers the React Query abort signal as the third argument to apiClient.get", async () => {
    const client = makeClient();
    renderHook(() => useAgentPulse(), { wrapper: wrap(client) });
    await waitFor(() => expect(getApiClient().get).toHaveBeenCalled());
    const thirdArg: unknown = getApiClient().get.mock.calls[0]?.[2];
    expect(thirdArg).toBeInstanceOf(AbortSignal);
  });
});

describe("BSN-04-033 — post-commit patch scope for rename mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiClient().patch.mockResolvedValue({ pmWorkspaceId: "ws-1", name: "Renamed" });
  });

  it("useUpdatePmWorkspace patches the renamed row into every loaded list page instead of refetching them", async () => {
    const client = makeClient();
    const listKey = buildWorkQueryKeys.projects.pmWorkspaces.list({ search: "acme" });
    client.setQueryData(listKey, {
      data: [
        { pmWorkspaceId: "ws-1", name: "Old name" },
        { pmWorkspaceId: "ws-2", name: "Untouched" },
      ],
      hasMore: false,
      nextCursor: null,
    });
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdatePmWorkspace(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ pmWorkspaceId: "ws-1", name: "Renamed" });
    });

    const patched = client.getQueryData(listKey) as {
      data: { pmWorkspaceId: string; name: string }[];
    };
    expect(patched.data[0]?.name).toBe("Renamed");
    expect(patched.data[1]?.name).toBe("Untouched");
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("useUpdatePmWorkspace writes the response straight into the detail entry rather than triggering a refetch", async () => {
    getApiClient().patch.mockResolvedValue({ pmWorkspaceId: "ws-7", name: "New name" });
    const client = makeClient();
    const { result } = renderHook(() => useUpdatePmWorkspace(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ pmWorkspaceId: "ws-7", name: "New name" });
    });

    expect(
      client.getQueryData(buildWorkQueryKeys.projects.pmWorkspaces.detail("ws-7")),
    ).toEqual({ pmWorkspaceId: "ws-7", name: "New name" });
  });

  it("useUpdatePmWorkspace leaves a list page that does not hold the renamed row untouched", async () => {
    const client = makeClient();
    const otherKey = buildWorkQueryKeys.projects.pmWorkspaces.list({ search: "zzz" });
    const original = {
      data: [{ pmWorkspaceId: "ws-9", name: "Elsewhere" }],
      hasMore: false,
      nextCursor: null,
    };
    client.setQueryData(otherKey, original);
    const { result } = renderHook(() => useUpdatePmWorkspace(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ pmWorkspaceId: "ws-1", name: "Renamed" });
    });

    expect(client.getQueryData(otherKey)).toBe(original);
  });

  it("useUpdateManagedProduct patches the renamed product into loaded list pages instead of refetching every filter variant", async () => {
    getApiClient().patch.mockResolvedValue({ id: 5, name: "Renamed product" });
    const client = makeClient();
    const listKey = buildWorkQueryKeys.projects.managedProducts.list({ status: "ACTIVE" });
    client.setQueryData(listKey, {
      data: [
        { id: 5, name: "Old product" },
        { id: 6, name: "Untouched" },
      ],
      hasMore: false,
      nextCursor: null,
    });
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateManagedProduct(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ managedProductId: 5, name: "Renamed product" });
    });

    const patched = client.getQueryData(listKey) as {
      data: { id: number; name: string }[];
    };
    expect(patched.data[0]?.name).toBe("Renamed product");
    expect(patched.data[1]?.name).toBe("Untouched");
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
