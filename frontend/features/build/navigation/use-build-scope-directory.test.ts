import { act, renderHook } from "@testing-library/react";
import { useBuildScopeDirectory } from "./use-build-scope-directory";
import { useCanState } from "@/hooks/api/access";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import {
  useManagedProducts,
  useInfiniteManagedProducts,
} from "@/hooks/api/build/managed-products";
import {
  usePmWorkspaces,
  useInfinitePmWorkspaces,
} from "@/hooks/api/build/pm-workspaces";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import type { AccessState } from "@/lib/rbac/gate";
import type { ProjectListResponse } from "@/types/projects";
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";
import { idleInfiniteQueryResult, idleQueryResult } from "@/test-utils/query-result";

jest.mock("@/hooks/api/access");
jest.mock("@/hooks/api/build/projects");
jest.mock("@/hooks/api/build/managed-products");
jest.mock("@/hooks/api/build/pm-workspaces");
jest.mock("@/hooks/common/use-debounce");

const mockUseCanState = useCanState as jest.MockedFunction<typeof useCanState>;
const mockUseInfiniteProjects = useInfiniteProjects as jest.MockedFunction<typeof useInfiniteProjects>;
const mockUseManagedProducts = useManagedProducts as jest.MockedFunction<typeof useManagedProducts>;
const mockUseInfiniteManagedProducts = useInfiniteManagedProducts as jest.MockedFunction<typeof useInfiniteManagedProducts>;
const mockUsePmWorkspaces = usePmWorkspaces as jest.MockedFunction<typeof usePmWorkspaces>;
const mockUseInfinitePmWorkspaces = useInfinitePmWorkspaces as jest.MockedFunction<typeof useInfinitePmWorkspaces>;
const mockUseDebouncedValue = useDebouncedValue as jest.MockedFunction<typeof useDebouncedValue>;

function makeEmptyQuery<TData = unknown>(
  overrides: Partial<UseQueryResult<TData, Error>> = {},
): UseQueryResult<TData, Error> {
  return { ...idleQueryResult<TData>(), refetch: jest.fn(), ...overrides } as UseQueryResult<
    TData,
    Error
  >;
}

function makeEmptyInfiniteQuery<TPage = unknown>(
  overrides: Partial<UseInfiniteQueryResult<InfiniteData<TPage, unknown>, Error>> = {},
): UseInfiniteQueryResult<InfiniteData<TPage, unknown>, Error> {
  return {
    ...idleInfiniteQueryResult<TPage>(),
    fetchNextPage: jest.fn().mockResolvedValue(undefined),
    refetch: jest.fn(),
    ...overrides,
  } as UseInfiniteQueryResult<InfiniteData<TPage, unknown>, Error>;
}

function makePmWorkspacesPage(
  rows: { pmWorkspaceId: string; name: string; status: string }[],
  hasMore = false,
  nextCursor: string | null = null,
) {
  return {
    data: rows,
    pagination: { limit: 100, hasMore, nextCursor },
  };
}

function makeManagedProductsPage(
  rows: { id: number; name: string; status: string; pmWorkspaceId: string | null; key: string }[],
  hasMore = false,
  nextCursor: string | null = null,
) {
  return {
    data: rows,
    pagination: { limit: 100, hasMore, nextCursor },
  };
}

function makeInfiniteWsData(
  pages: ReturnType<typeof makePmWorkspacesPage>[],
): { pages: ReturnType<typeof makePmWorkspacesPage>[]; pageParams: (string | undefined)[] } {
  return {
    pages,
    pageParams: pages.map((_, i) =>
      i === 0 ? undefined : pages[i - 1]?.pagination.nextCursor ?? undefined,
    ),
  };
}

function makeInfiniteProductsData(
  pages: ReturnType<typeof makeManagedProductsPage>[],
): { pages: ReturnType<typeof makeManagedProductsPage>[]; pageParams: (string | undefined)[] } {
  return {
    pages,
    pageParams: pages.map((_, i) =>
      i === 0 ? undefined : pages[i - 1]?.pagination.nextCursor ?? undefined,
    ),
  };
}

function makeProjectsInfiniteData(
  pages: { data: { id: number; name: string; key: string; status: string; managedProductId: number | null; pmWorkspaceId: string | undefined }[]; hasMore: boolean; nextCursor: number | null }[],
): { pages: typeof pages; pageParams: (number | undefined)[] } {
  return {
    pages,
    pageParams: pages.map((_, i) => (i === 0 ? undefined : pages[i - 1]?.nextCursor ?? undefined)),
  };
}

function setupGrantedAccessMocks(debounced = "") {
  mockUseCanState.mockReturnValue("granted" as AccessState);
  mockUseDebouncedValue.mockReturnValue(debounced);
  mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteProjects>);
  mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
  mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteManagedProducts>);
  mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);
  mockUseInfinitePmWorkspaces.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfinitePmWorkspaces>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BSN-02-015 — stale request isolation via debounced search", () => {
  test("useInfiniteProjects receives the debounced search term, not the raw keystroke value", () => {
    mockUseCanState.mockReturnValue("granted" as AccessState);
    mockUseDebouncedValue.mockReturnValue("debounced");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteProjects>);
    mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
    mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteManagedProducts>);
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);
    mockUseInfinitePmWorkspaces.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfinitePmWorkspaces>);

    renderHook(() => useBuildScopeDirectory("raw-rapidly-typed", false));

    const calls = mockUseInfiniteProjects.mock.calls;
    const searchCall = calls.find((args) => args[0]?.search !== undefined);
    expect(searchCall?.[0]).toMatchObject({ search: "debounced" });
  });

  test("with empty debounced value, useInfiniteProjects is called without a search param so no request fires for blank queries", () => {
    setupGrantedAccessMocks("");

    renderHook(() => useBuildScopeDirectory("", false));

    const calls = mockUseInfiniteProjects.mock.calls;
    const callWithSearch = calls.find((args) => args[0]?.search !== undefined);
    expect(callWithSearch).toBeUndefined();
  });
});

describe("BSN-02-016 — background refresh indicator does not destroy results", () => {
  test("isRefreshing is true when a display query is fetching but has existing data", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery({
        isFetching: true,
        isLoading: false,
        isFetchingNextPage: false,
        data: makeProjectsInfiniteData([{ data: [], hasMore: false, nextCursor: null }]),
      }) as ReturnType<typeof useInfiniteProjects>,
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
      makeEmptyInfiniteQuery({ isFetching: true, isLoading: true }) as ReturnType<typeof useInfiniteProjects>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isRefreshing).toBe(false);
  });

  test("isFetchingNextPage does not set isRefreshing so the global spinner stays quiet while load-more runs", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery({
        isFetching: true,
        isLoading: false,
        isFetchingNextPage: true,
        data: makeProjectsInfiniteData([{ data: [], hasMore: true, nextCursor: 99 }]),
      }) as ReturnType<typeof useInfiniteProjects>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isRefreshing).toBe(false);
  });
});

describe("BSN-02-017 — isDenied and isLoading correctly distinguish access states", () => {
  test("isDenied is true when the access response says the user lacks build:view", () => {
    mockUseCanState.mockReturnValue("denied" as AccessState);
    mockUseDebouncedValue.mockReturnValue("");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteProjects>);
    mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
    mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteManagedProducts>);
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);
    mockUseInfinitePmWorkspaces.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfinitePmWorkspaces>);

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isDenied).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading is true and isDenied is false while the access response is still in flight", () => {
    mockUseCanState.mockReturnValue("loading" as AccessState);
    mockUseDebouncedValue.mockReturnValue("");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteProjects>);
    mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
    mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteManagedProducts>);
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);
    mockUseInfinitePmWorkspaces.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfinitePmWorkspaces>);

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
      makeEmptyInfiniteQuery({
        isSuccess: true,
        data: makeProjectsInfiniteData([
          {
            data: [
              { id: 1, name: "P1", key: "P1", status: "ACTIVE", managedProductId: null, pmWorkspaceId: undefined },
              { id: 2, name: "P2", key: "P2", status: "ACTIVE", managedProductId: null, pmWorkspaceId: undefined },
            ],
            hasMore: true,
            nextCursor: 2,
          },
          {
            data: [
              { id: 3, name: "P3", key: "P3", status: "ACTIVE", managedProductId: null, pmWorkspaceId: undefined },
              { id: 4, name: "P4", key: "P4", status: "ACTIVE", managedProductId: null, pmWorkspaceId: undefined },
            ],
            hasMore: false,
            nextCursor: null,
          },
        ]),
      }) as ReturnType<typeof useInfiniteProjects>,
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
      makeEmptyInfiniteQuery({ hasNextPage: true }) as ReturnType<typeof useInfiniteProjects>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreProjects).toBe(true);
  });

  test("isFetchingMoreProjects mirrors isFetchingNextPage from the infinite query", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery({ isFetchingNextPage: true }) as ReturnType<typeof useInfiniteProjects>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isFetchingMoreProjects).toBe(true);
  });

  test("fetchMoreProjects delegates to fetchNextPage so TanStack appends the next cursor page", () => {
    setupGrantedAccessMocks();
    const fetchNextPage = jest.fn().mockResolvedValue(undefined);
    mockUseInfiniteProjects.mockReturnValue(
      makeEmptyInfiniteQuery({ hasNextPage: true, fetchNextPage }) as ReturnType<typeof useInfiniteProjects>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    act(() => { result.current.fetchMoreProjects(); });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  test("changing the search term causes useInfiniteProjects to be called with the new filter, not the old cursor", () => {
    mockUseCanState.mockReturnValue("granted" as AccessState);
    mockUseDebouncedValue.mockReturnValue("alpha");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteProjects>);
    mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
    mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteManagedProducts>);
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);
    mockUseInfinitePmWorkspaces.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfinitePmWorkspaces>);

    const { rerender } = renderHook(
      ({ search }: { search: string }) => useBuildScopeDirectory(search, false),
      { initialProps: { search: "alpha" } },
    );

    mockUseDebouncedValue.mockReturnValue("beta");
    rerender({ search: "beta" });

    const calls = mockUseInfiniteProjects.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toMatchObject({ search: "beta" });
    expect(lastCall?.[0]).not.toHaveProperty("afterId");
  });
});

describe("BSN-02-014 — hierarchy continuation: infinite queries eliminate the two-page cursor ceiling", () => {
  test("hasMoreHierarchy is true when the workspace infinite query reports hasNextPage", () => {
    setupGrantedAccessMocks();
    mockUseInfinitePmWorkspaces.mockReturnValue(
      makeEmptyInfiniteQuery({
        hasNextPage: true,
        isSuccess: true,
        data: makeInfiniteWsData([
          makePmWorkspacesPage(
            [{ pmWorkspaceId: "ws1", name: "WS 1", status: "active" }],
            true,
            "ws-cursor-2",
          ),
        ]),
      }) as ReturnType<typeof useInfinitePmWorkspaces>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreHierarchy).toBe(true);
  });

  test("hasMoreHierarchy is true when the product infinite query reports hasNextPage", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteManagedProducts.mockReturnValue(
      makeEmptyInfiniteQuery({
        hasNextPage: true,
        isSuccess: true,
        data: makeInfiniteProductsData([
          makeManagedProductsPage(
            [{ id: 1, name: "Prod 1", status: "active", pmWorkspaceId: null, key: "P1" }],
            true,
            "prod-cursor-2",
          ),
        ]),
      }) as ReturnType<typeof useInfiniteManagedProducts>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreHierarchy).toBe(true);
  });

  test("a third page of workspaces is still reachable, so a large org is never silently truncated", () => {
    setupGrantedAccessMocks();
    mockUseInfinitePmWorkspaces.mockReturnValue(
      makeEmptyInfiniteQuery({
        hasNextPage: true,
        isSuccess: true,
        data: makeInfiniteWsData([
          makePmWorkspacesPage(
            [{ pmWorkspaceId: "ws1", name: "WS 1", status: "active" }],
            true,
            "ws-cursor-2",
          ),
          makePmWorkspacesPage(
            [{ pmWorkspaceId: "ws2", name: "WS 2", status: "active" }],
            true,
            "ws-cursor-3",
          ),
        ]),
      }) as ReturnType<typeof useInfinitePmWorkspaces>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreHierarchy).toBe(true);
    expect(result.current.workspaces.map((w) => w.id)).toEqual(["ws1", "ws2"]);
  });

  test("a third page of products is still reachable, so a large org is never silently truncated", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteManagedProducts.mockReturnValue(
      makeEmptyInfiniteQuery({
        hasNextPage: true,
        isSuccess: true,
        data: makeInfiniteProductsData([
          makeManagedProductsPage(
            [{ id: 1, name: "Prod 1", status: "active", pmWorkspaceId: null, key: "P1" }],
            true,
            "prod-cursor-2",
          ),
          makeManagedProductsPage(
            [{ id: 2, name: "Prod 2", status: "active", pmWorkspaceId: null, key: "P2" }],
            true,
            "prod-cursor-3",
          ),
        ]),
      }) as ReturnType<typeof useInfiniteManagedProducts>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreHierarchy).toBe(true);
  });

  test("hasMoreHierarchy is false when both the workspace and product infinite queries have no next page", () => {
    setupGrantedAccessMocks();

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreHierarchy).toBe(false);
  });

  test("workspace rows from all loaded infinite pages combine without duplicates in load order", () => {
    setupGrantedAccessMocks();
    mockUseInfinitePmWorkspaces.mockReturnValue(
      makeEmptyInfiniteQuery({
        hasNextPage: false,
        isSuccess: true,
        data: makeInfiniteWsData([
          makePmWorkspacesPage(
            [{ pmWorkspaceId: "ws1", name: "WS 1", status: "active" }],
            true,
            "ws-cursor-2",
          ),
          makePmWorkspacesPage(
            [{ pmWorkspaceId: "ws2", name: "WS 2", status: "active" }],
            false,
            null,
          ),
        ]),
      }) as ReturnType<typeof useInfinitePmWorkspaces>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    const wsIds = result.current.workspaces.map((w) => w.id);
    const uniqueIds = [...new Set(wsIds)];
    expect(wsIds).toEqual(uniqueIds);
    expect(wsIds).toEqual(["ws1", "ws2"]);
  });

  test("fetchMoreHierarchy calls fetchNextPage on both workspace and product infinite queries", () => {
    setupGrantedAccessMocks();
    const wsFetchNextPage = jest.fn().mockResolvedValue(undefined);
    const productsFetchNextPage = jest.fn().mockResolvedValue(undefined);
    mockUseInfinitePmWorkspaces.mockReturnValue(
      makeEmptyInfiniteQuery({
        hasNextPage: true,
        fetchNextPage: wsFetchNextPage,
      }) as ReturnType<typeof useInfinitePmWorkspaces>,
    );
    mockUseInfiniteManagedProducts.mockReturnValue(
      makeEmptyInfiniteQuery({
        hasNextPage: true,
        fetchNextPage: productsFetchNextPage,
      }) as ReturnType<typeof useInfiniteManagedProducts>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    act(() => { result.current.fetchMoreHierarchy(); });

    expect(wsFetchNextPage).toHaveBeenCalledTimes(1);
    expect(productsFetchNextPage).toHaveBeenCalledTimes(1);
  });

  test("isFetchingMoreHierarchy mirrors isFetchingNextPage from the workspace infinite query", () => {
    setupGrantedAccessMocks();
    mockUseInfinitePmWorkspaces.mockReturnValue(
      makeEmptyInfiniteQuery({ isFetchingNextPage: true }) as ReturnType<typeof useInfinitePmWorkspaces>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isFetchingMoreHierarchy).toBe(true);
  });

  test("isFetchingMoreHierarchy mirrors isFetchingNextPage from the product infinite query", () => {
    setupGrantedAccessMocks();
    mockUseInfiniteManagedProducts.mockReturnValue(
      makeEmptyInfiniteQuery({ isFetchingNextPage: true }) as ReturnType<typeof useInfiniteManagedProducts>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isFetchingMoreHierarchy).toBe(true);
  });

  test("changing the search term calls useInfinitePmWorkspaces with the new search so stale cursors from the previous query do not persist", () => {
    mockUseCanState.mockReturnValue("granted" as AccessState);
    mockUseDebouncedValue.mockReturnValue("alpha");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteProjects>);
    mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
    mockUseInfiniteManagedProducts.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteManagedProducts>);
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);
    mockUseInfinitePmWorkspaces.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfinitePmWorkspaces>);

    const { rerender } = renderHook(
      ({ search }: { search: string }) => useBuildScopeDirectory(search, false),
      { initialProps: { search: "alpha" } },
    );

    mockUseDebouncedValue.mockReturnValue("beta");
    rerender({ search: "beta" });

    const calls = mockUseInfinitePmWorkspaces.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toMatchObject({ search: "beta" });
  });
});
