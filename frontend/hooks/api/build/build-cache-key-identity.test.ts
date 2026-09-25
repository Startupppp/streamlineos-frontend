import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useManagedProducts, useUpdateManagedProduct } from "@/hooks/api/build/managed-products";
import { useAgentPulse } from "@/hooks/api/build/agent-pulse";
import { useInfiniteBuildScopeSearch } from "@/hooks/api/build/scope-directory";
import type { BuildScope } from "@/lib/build/build-scope";

const ORG_SCOPE: BuildScope = {
  type: "organization",
  managedProductId: null,
  projectId: null,
  basePath: "/build",
};

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: {
      isOrgOwner: false,
      scopes: {
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

jest.mock("@/hooks/api/build/scope-directory-schema", () => ({
  scopeDirectorySearchContract: null,
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
  it("managed-products list key with search differs from key without search", () => {
    const withSearch = buildWorkQueryKeys.projects.managedProducts.list({ search: "Acme" });
    const noSearch = buildWorkQueryKeys.projects.managedProducts.list();
    expect(JSON.stringify(withSearch)).not.toEqual(JSON.stringify(noSearch));
  });

  it("scope-directory resolve key sorts input so callers with different orderings share one cache entry", () => {
    const ab = buildWorkQueryKeys.projects.scopeDirectory.resolve(["project:1", "product:2"]);
    const ba = buildWorkQueryKeys.projects.scopeDirectory.resolve(["product:2", "project:1"]);
    expect(JSON.stringify(ab)).toEqual(JSON.stringify(ba));
  });

  it("scope-directory search keys isolate rapid query changes", () => {
    const alpha = buildWorkQueryKeys.projects.scopeDirectory.search({ q: "alpha", limit: 100 });
    const beta = buildWorkQueryKeys.projects.scopeDirectory.search({ q: "beta", limit: 100 });
    expect(JSON.stringify(alpha)).not.toEqual(JSON.stringify(beta));
  });

  it("agent-pulse keys differ per Build scope so one scope's top signal is never served to another", () => {
    const project = buildWorkQueryKeys.projects.agentPulse("project:42");
    const product = buildWorkQueryKeys.projects.agentPulse("product:5");
    expect(JSON.stringify(project)).not.toEqual(JSON.stringify(product));
  });

  it("agent-pulse key is stable for one scope so repeated renders share a cache entry", () => {
    const k1 = buildWorkQueryKeys.projects.agentPulse("project:42");
    const k2 = buildWorkQueryKeys.projects.agentPulse("project:42");
    expect(JSON.stringify(k1)).toEqual(JSON.stringify(k2));
  });

  it("agent-pulse scope segment carries no literal undefined, so an invalidation prefix still matches", () => {
    const key = buildWorkQueryKeys.projects.agentPulse("organization");
    expect(key).not.toContain(undefined);
    expect(key[key.length - 1]).toBe("organization");
  });
});

describe("BSN-04-032 — queryFns pass the AbortSignal to apiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiClient().get.mockResolvedValue(null);
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
    renderHook(() => useAgentPulse(ORG_SCOPE), { wrapper: wrap(client) });
    await waitFor(() => expect(getApiClient().get).toHaveBeenCalled());
    const thirdArg: unknown = getApiClient().get.mock.calls[0]?.[2];
    expect(thirdArg).toBeInstanceOf(AbortSignal);
  });

  it("useInfiniteBuildScopeSearch calls the authorized directory endpoint with a bounded page and abort signal", async () => {
    getApiClient().get.mockResolvedValue({ data: [], nextCursor: null });
    const client = makeClient();
    renderHook(() => useInfiniteBuildScopeSearch("alpha"), { wrapper: wrap(client) });
    await waitFor(() => expect(getApiClient().get).toHaveBeenCalled());
    expect(getApiClient().get.mock.calls[0]?.[0]).toBe("/build/scope-directory/search");
    expect(getApiClient().get.mock.calls[0]?.[1]).toEqual({ q: "alpha", limit: 100 });
    expect(getApiClient().get.mock.calls[0]?.[2]).toBeInstanceOf(AbortSignal);
  });
});

describe("BSN-04-033 — post-commit patch scope for rename mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: buildWorkQueryKeys.projects.scopeDirectory.all,
    });
  });

  it("useUpdateManagedProduct patches every loaded infinite page used by the scope browser", async () => {
    getApiClient().patch.mockResolvedValue({ id: 5, name: "Renamed product" });
    const client = makeClient();
    const listKey = buildWorkQueryKeys.projects.managedProducts.listInfinite({ limit: "100" });
    client.setQueryData(listKey, {
      pages: [
        { data: [{ id: 6, name: "Untouched" }], pagination: { limit: 100, hasMore: true, nextCursor: "next" } },
        { data: [{ id: 5, name: "Old product" }], pagination: { limit: 100, hasMore: false, nextCursor: null } },
      ],
      pageParams: [undefined, "next"],
    });
    const { result } = renderHook(() => useUpdateManagedProduct(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ managedProductId: 5, name: "Renamed product" });
    });

    const patched = client.getQueryData(listKey) as {
      pages: { data: { id: number; name: string }[] }[];
    };
    expect(patched.pages[0]?.data[0]?.name).toBe("Untouched");
    expect(patched.pages[1]?.data[0]?.name).toBe("Renamed product");
  });
});
