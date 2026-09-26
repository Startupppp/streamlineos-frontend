import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ManagedProduct, ManagedProductsPage } from "@/types/projects";

jest.mock("@/lib/dom-mutation-guard", () => ({}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: { isOrgOwner: true, scopes: {}, modules: {} },
    refetch: jest.fn().mockResolvedValue({ data: { isOrgOwner: true } }),
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    post: jest.fn(),
  },
  isApiError: () => false,
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: {
    get: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
    post: jest.Mock;
  };
};

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function makeProduct(overrides: Partial<ManagedProduct> = {}): ManagedProduct {
  return {
    id: 1,
    orgId: "org-1",
    name: "Alpha",
    key: "ALPHA",
    description: null,
    status: "active",
    ownerId: null,
    vision: null,
    missionStatement: null,
    targetCustomer: null,
    differentiators: null,
    currentPhase: null,
    targetLaunchDate: null,
    successMetrics: null,
    ownerMembershipId: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makePage(overrides: Partial<ManagedProductsPage> = {}): ManagedProductsPage {
  return {
    data: [makeProduct()],
    pagination: { limit: 20, hasMore: false, nextCursor: null },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useInfiniteManagedProducts — cursor semantics", () => {
  it("uses the server's nextCursor as the next page param so pagination is keyset-stable across filter changes", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    const firstPage = makePage({
      pagination: { limit: 20, hasMore: true, nextCursor: "cursor-page-2" },
    });
    apiClient.get.mockResolvedValue(firstPage);

    const { useInfiniteManagedProducts } = await import("./managed-products");
    const { result } = renderHook(() => useInfiniteManagedProducts({}), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const page = result.current.data?.pages[0];
    expect(page?.pagination.nextCursor).toBe("cursor-page-2");
    expect(result.current.hasNextPage).toBe(true);
  });

  it("reports no next page when the server cursor is null so the list stops fetching at the true boundary", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    apiClient.get.mockResolvedValue(makePage({ pagination: { limit: 20, hasMore: false, nextCursor: null } }));

    const { useInfiniteManagedProducts } = await import("./managed-products");
    const { result } = renderHook(() => useInfiniteManagedProducts({}), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it("sends the cursor from the previous page on the second fetch so the window is stable under concurrent writes", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    apiClient.get
      .mockResolvedValueOnce(makePage({ pagination: { limit: 20, hasMore: true, nextCursor: "cursor-pg2" } }))
      .mockResolvedValue(makePage());

    const { useInfiniteManagedProducts } = await import("./managed-products");
    const { result } = renderHook(() => useInfiniteManagedProducts({}), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    const secondCall = apiClient.get.mock.calls[1] as [string, Record<string, string>];
    expect(secondCall[1]).toMatchObject({ cursor: "cursor-pg2" });
  });
});

describe("useManagedProducts — cache key includes normalized filters", () => {
  it("includes the status filter in the query key so two different statuses do not share a cache entry", async () => {
    const listKey = buildWorkQueryKeys.projects.managedProducts.list({ status: "archived" });
    const listKeyNoFilter = buildWorkQueryKeys.projects.managedProducts.list();

    const serialized = JSON.stringify(listKey);
    const serializedNoFilter = JSON.stringify(listKeyNoFilter);

    expect(serialized).toContain("archived");
    expect(serializedNoFilter).not.toContain("archived");
    expect(serialized).not.toBe(serializedNoFilter);
  });

  it("includes the search filter in the query key so a search cache miss does not return unfiltered rows", async () => {
    const keyWithSearch = buildWorkQueryKeys.projects.managedProducts.list({ search: "alpha" });
    const keyWithoutSearch = buildWorkQueryKeys.projects.managedProducts.list();

    expect(JSON.stringify(keyWithSearch)).toContain("alpha");
    expect(JSON.stringify(keyWithoutSearch)).not.toContain("alpha");
    expect(JSON.stringify(keyWithSearch)).not.toBe(JSON.stringify(keyWithoutSearch));
  });
});

describe("useUpdateManagedProduct — optimistic cache patch", () => {
  it("patches the detail cache immediately after a successful update so the overview re-renders without a round trip", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    const original = makeProduct({ id: 5, name: "Old name" });
    const updated = makeProduct({ id: 5, name: "New name", updatedAt: "2026-06-01T00:00:00Z" });

    client.setQueryData(buildWorkQueryKeys.projects.managedProducts.detail(5), original);
    apiClient.patch.mockResolvedValue(updated);

    const { useUpdateManagedProduct } = await import("./managed-products");
    const { result } = renderHook(() => useUpdateManagedProduct(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ managedProductId: 5, name: "New name" });
    });

    const cached = client.getQueryData<ManagedProduct>(
      buildWorkQueryKeys.projects.managedProducts.detail(5),
    );
    expect(cached?.name).toBe("New name");
  });

  it("patches a list page entry in place so the row reflects the new name without full refetch", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    const original = makeProduct({ id: 7, name: "Original" });
    const pageData = makePage({ data: [original] });
    const listKey = buildWorkQueryKeys.projects.managedProducts.list();

    client.setQueryData(listKey, pageData);
    const updated = makeProduct({ id: 7, name: "Updated" });
    apiClient.patch.mockResolvedValue(updated);

    const { useUpdateManagedProduct } = await import("./managed-products");
    const { result } = renderHook(() => useUpdateManagedProduct(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ managedProductId: 7, name: "Updated" });
    });

    const cachedPage = client.getQueryData<ManagedProductsPage>(listKey);
    expect(cachedPage?.data[0].name).toBe("Updated");
  });
});

describe("useDeleteManagedProduct — invalidation after delete", () => {
  it("invalidates the managed-products list so the deleted row is absent on the next render", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    const listKey = buildWorkQueryKeys.projects.managedProducts.list();
    client.setQueryData(listKey, makePage());
    apiClient.delete.mockResolvedValue(undefined);

    const { useDeleteManagedProduct } = await import("./managed-products");
    const { result } = renderHook(() => useDeleteManagedProduct(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    await waitFor(() => {
      expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
    });
  });
});

describe("useCreateManagedProduct — invalidation after create", () => {
  it("invalidates the managed-products list so the new product appears on the next fetch", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    const listKey = buildWorkQueryKeys.projects.managedProducts.list();
    client.setQueryData(listKey, makePage());
    apiClient.post.mockResolvedValue(makeProduct({ id: 99, name: "Brand new" }));

    const { useCreateManagedProduct } = await import("./managed-products");
    const { result } = renderHook(() => useCreateManagedProduct(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: "Brand new", key: "NEW" });
    });

    await waitFor(() => {
      expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
    });
  });
});
