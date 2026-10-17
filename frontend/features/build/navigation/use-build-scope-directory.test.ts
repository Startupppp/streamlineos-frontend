import { act, renderHook } from "@testing-library/react";
import { useBuildScopeDirectory } from "./use-build-scope-directory";
import { useCanState } from "@/hooks/api/access";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import { useInfiniteManagedProducts } from "@/hooks/api/build/managed-products";
import { useInfiniteBuildScopeSearch } from "@/hooks/api/build/scope-directory";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import type { AccessState } from "@/lib/rbac/gate";
import type { ManagedProductsPage, ProjectListResponse } from "@/types/projects";
import type { BuildScopeSearchPage } from "@/hooks/api/build/scope-directory";
import {
  makeEmptyInfiniteQuery,
  makeInfiniteProductsData,
  makeManagedProductsPage,
  makeProjectsInfiniteData,
} from "./use-build-scope-directory.test-fixtures";

jest.mock("@/hooks/api/access");
jest.mock("@/hooks/api/build/projects");
jest.mock("@/hooks/api/build/managed-products");
jest.mock("@/hooks/api/build/scope-directory");
jest.mock("@/hooks/common/use-debounce");

const mockUseCanState = useCanState as jest.MockedFunction<typeof useCanState>;
const mockUseInfiniteProjects = useInfiniteProjects as jest.MockedFunction<typeof useInfiniteProjects>;
const mockUseInfiniteManagedProducts = useInfiniteManagedProducts as jest.MockedFunction<typeof useInfiniteManagedProducts>;
const mockUseInfiniteBuildScopeSearch = useInfiniteBuildScopeSearch as jest.MockedFunction<typeof useInfiniteBuildScopeSearch>;
const mockUseDebouncedValue = useDebouncedValue as jest.MockedFunction<typeof useDebouncedValue>;

function setupGrantedAccessMocks(debounced = "") {
  mockUseCanState.mockReturnValue("granted" as AccessState);
  mockUseDebouncedValue.mockReturnValue(debounced);
  mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>());
  mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>());
  mockUseInfiniteBuildScopeSearch.mockReturnValue(makeEmptyInfiniteQuery<BuildScopeSearchPage, string | undefined>());
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BSN-02-015 — stale request isolation via debounced search", () => {
  test("the unified directory search receives the debounced term and waits until it matches the current input", () => {
    setupGrantedAccessMocks("debounced");

    renderHook(() => useBuildScopeDirectory("debounced", false));

    expect(mockUseInfiniteBuildScopeSearch).toHaveBeenLastCalledWith(
      "debounced",
      { enabled: true },
    );
  });

  test("a blank query leaves the unified directory search disabled", () => {
    setupGrantedAccessMocks("");

    renderHook(() => useBuildScopeDirectory("", false));

    expect(mockUseInfiniteBuildScopeSearch).toHaveBeenLastCalledWith("", {
      enabled: false,
    });
  });
});

describe("BLD-X-SB-DIR-001 — unified authorized directory search", () => {
  const linkedProject = {
    key: "project:42",
    type: "project" as const,
    id: "42",
    name: "Checkout",
    parentKey: "product:7",
    projectKey: "PAY",
    isArchived: false,
    parentPath: "Payments",
    clientPortalEnabled: true,
  };

  test("uses the server parent path for a linked project even when its product is not loaded in browse pages", () => {
    setupGrantedAccessMocks("PAY");
    mockUseInfiniteBuildScopeSearch.mockReturnValue(
      makeEmptyInfiniteQuery<BuildScopeSearchPage, string | undefined>({
        isSuccess: true,
        data: { pages: [{ data: [linkedProject], nextCursor: null }], pageParams: [undefined] },
      }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("PAY", false));

    expect(result.current.projects).toEqual([
      expect.objectContaining({
        key: "project:42",
        parentKey: "product:7",
        parentPath: "Payments",
        href: "/build/42",
      }),
    ]);
  });

  test("exposes one continuation for the ranked mixed-type result set", () => {
    setupGrantedAccessMocks("pay");
    const fetchNextPage = jest.fn().mockResolvedValue(undefined);
    mockUseInfiniteBuildScopeSearch.mockReturnValue(
      makeEmptyInfiniteQuery<BuildScopeSearchPage, string | undefined>({ hasNextPage: true, fetchNextPage }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("pay", false));
    act(() => result.current.fetchMoreSearchResults());

    expect(result.current.hasMoreSearchResults).toBe(true);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  test("does not render an old debounced result while a newer input is waiting", () => {
    setupGrantedAccessMocks("old");
    mockUseInfiniteBuildScopeSearch.mockReturnValue(
      makeEmptyInfiniteQuery<BuildScopeSearchPage, string | undefined>({
        isSuccess: true,
        data: { pages: [{ data: [linkedProject], nextCursor: null }], pageParams: [undefined] },
      }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("new", false));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.projects).toEqual([]);
  });
});

describe("BSN-02-016 — background refresh indicator does not destroy results", () => {
  test("isRefreshing is true when a display query is fetching but has existing data", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>({
        isFetching: true,
        isLoading: false,
        isFetchingNextPage: false,
        data: makeProjectsInfiniteData([{ data: [], hasMore: false, nextCursor: null }]),
      }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isRefreshing).toBe(true);
  });

  test("isRefreshing is false when no display query is fetching in the background", () => {
    setupGrantedAccessMocks();

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isRefreshing).toBe(false);
  });

  test("initial load with isFetching and no data does not set isRefreshing because isLoading is also true", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>({ isFetching: true, isLoading: true }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isRefreshing).toBe(false);
  });

  test("isFetchingNextPage does not set isRefreshing so the global spinner stays quiet while load-more runs", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>({
        isFetching: true,
        isLoading: false,
        isFetchingNextPage: true,
        data: makeProjectsInfiniteData([{ data: [], hasMore: true, nextCursor: 99 }]),
      }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isRefreshing).toBe(false);
  });
});

describe("BSN-02-017 — isDenied and isLoading correctly distinguish access states", () => {
  test("isDenied is true when the access response says the user lacks build:view", () => {
    mockUseCanState.mockReturnValue("denied" as AccessState);
    mockUseDebouncedValue.mockReturnValue("");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>());
    mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>());
    mockUseInfiniteBuildScopeSearch.mockReturnValue(makeEmptyInfiniteQuery<BuildScopeSearchPage, string | undefined>());

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isDenied).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading is true and isDenied is false while the access response is still in flight", () => {
    mockUseCanState.mockReturnValue("loading" as AccessState);
    mockUseDebouncedValue.mockReturnValue("");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>());
    mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>());
    mockUseInfiniteBuildScopeSearch.mockReturnValue(makeEmptyInfiniteQuery<BuildScopeSearchPage, string | undefined>());

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isDenied).toBe(false);
  });

  test("isDenied is false and isLoading is false when access is granted and queries have data", () => {
    setupGrantedAccessMocks();

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isDenied).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("BSN-02-014 — project continuation: no duplicates, no reorder, cursor reset on filter change", () => {
  test("two loaded project pages yield unique ids in page-1-then-page-2 order with no duplicates", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>({
        isSuccess: true,
        data: makeProjectsInfiniteData([
          {
            data: [
              { id: 1, name: "P1", key: "P1", status: "ACTIVE", managedProductId: null },
              { id: 2, name: "P2", key: "P2", status: "ACTIVE", managedProductId: null },
            ],
            hasMore: true,
            nextCursor: 2,
          },
          {
            data: [
              { id: 3, name: "P3", key: "P3", status: "ACTIVE", managedProductId: null },
              { id: 4, name: "P4", key: "P4", status: "ACTIVE", managedProductId: null },
            ],
            hasMore: false,
            nextCursor: null,
          },
        ]),
      }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    const ids = result.current.projects.map((p) => p.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids).toEqual(uniqueIds);
    expect(ids).toEqual(["1", "2", "3", "4"]);
  });

  test("hasMoreProjects is true when the infinite query reports hasNextPage", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>({ hasNextPage: true }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreProjects).toBe(true);
  });

  test("isFetchingMoreProjects mirrors isFetchingNextPage from the infinite query", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>({ isFetchingNextPage: true }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isFetchingMoreProjects).toBe(true);
  });

  test("fetchMoreProjects delegates to fetchNextPage so TanStack appends the next cursor page", () => {
    setupGrantedAccessMocks();
    const fetchNextPage = jest.fn().mockResolvedValue(undefined);
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>({ hasNextPage: true, fetchNextPage }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    act(() => { result.current.fetchMoreProjects(); });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  test("changing the search term moves the unified search to the new query without carrying a cursor", () => {
    mockUseCanState.mockReturnValue("granted" as AccessState);
    mockUseDebouncedValue.mockReturnValue("alpha");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>());
    mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>());
    mockUseInfiniteBuildScopeSearch.mockReturnValue(makeEmptyInfiniteQuery<BuildScopeSearchPage, string | undefined>());

    const { rerender } = renderHook(
      ({ search }: { search: string }) => useBuildScopeDirectory(search, false),
      { initialProps: { search: "alpha" } },
    );

    mockUseDebouncedValue.mockReturnValue("beta");
    rerender({ search: "beta" });

    const calls = mockUseInfiniteBuildScopeSearch.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toBe("beta");
    expect(lastCall?.[1]).toEqual({ enabled: true });
  });
});

describe("BSN-02-014 — hierarchy continuation: the product infinite query eliminates the two-page cursor ceiling now that PM Workspace no longer supplies a second hierarchy source", () => {
  test("hasMoreHierarchy is true when the product infinite query reports hasNextPage", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteManagedProducts.mockReturnValue(
      makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>({
        hasNextPage: true,
        isSuccess: true,
        data: makeInfiniteProductsData([
          makeManagedProductsPage(
            [{ id: 1, name: "Prod 1", status: "active", key: "P1" }],
            true,
            "prod-cursor-2",
          ),
        ]),
      }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreHierarchy).toBe(true);
  });

  test("a third page of products is still reachable, so a large org is never silently truncated", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteManagedProducts.mockReturnValue(
      makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>({
        hasNextPage: true,
        isSuccess: true,
        data: makeInfiniteProductsData([
          makeManagedProductsPage(
            [{ id: 1, name: "Prod 1", status: "active", key: "P1" }],
            true,
            "prod-cursor-2",
          ),
          makeManagedProductsPage(
            [{ id: 2, name: "Prod 2", status: "active", key: "P2" }],
            true,
            "prod-cursor-3",
          ),
        ]),
      }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreHierarchy).toBe(true);
  });

  test("hasMoreHierarchy is false when the product infinite query has no next page", () => {
    setupGrantedAccessMocks();

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreHierarchy).toBe(false);
  });

  test("product rows from all loaded infinite pages combine without duplicates in load order", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteManagedProducts.mockReturnValue(
      makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>({
        hasNextPage: false,
        isSuccess: true,
        data: makeInfiniteProductsData([
          makeManagedProductsPage(
            [{ id: 1, name: "Prod 1", status: "active", key: "P1" }],
            true,
            "prod-cursor-2",
          ),
          makeManagedProductsPage(
            [{ id: 2, name: "Prod 2", status: "active", key: "P2" }],
            false,
            null,
          ),
        ]),
      }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    const productIds = result.current.products.map((p) => p.id);
    const uniqueIds = [...new Set(productIds)];
    expect(productIds).toEqual(uniqueIds);
    expect(productIds).toEqual(["1", "2"]);
  });

  test("fetchMoreHierarchy calls fetchNextPage on the product infinite query", () => {
    setupGrantedAccessMocks();
    const productsFetchNextPage = jest.fn().mockResolvedValue(undefined);
    mockUseInfiniteManagedProducts.mockReturnValue(
      makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>({
        hasNextPage: true,
        fetchNextPage: productsFetchNextPage,
      }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    act(() => { result.current.fetchMoreHierarchy(); });

    expect(productsFetchNextPage).toHaveBeenCalledTimes(1);
  });

  test("isFetchingMoreHierarchy mirrors isFetchingNextPage from the product infinite query", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteManagedProducts.mockReturnValue(
      makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>({ isFetchingNextPage: true }),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isFetchingMoreHierarchy).toBe(true);
  });

  test("search does not repurpose the browse product query, so parent hierarchy pagination stays on its own cache entry", () => {
    mockUseCanState.mockReturnValue("granted" as AccessState);
    mockUseDebouncedValue.mockReturnValue("alpha");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery<ProjectListResponse, number | undefined>());
    mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery<ManagedProductsPage, string | undefined>());
    mockUseInfiniteBuildScopeSearch.mockReturnValue(makeEmptyInfiniteQuery<BuildScopeSearchPage, string | undefined>());

    const { rerender } = renderHook(
      ({ search }: { search: string }) => useBuildScopeDirectory(search, false),
      { initialProps: { search: "alpha" } },
    );

    mockUseDebouncedValue.mockReturnValue("beta");
    rerender({ search: "beta" });

    const calls = mockUseInfiniteManagedProducts.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toEqual({ limit: 100 });
  });
});

