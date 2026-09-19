import { act, renderHook } from "@testing-library/react";
import { useBuildScopeDirectory } from "./use-build-scope-directory";
import { useCanState } from "@/hooks/api/access";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import { useManagedProducts } from "@/hooks/api/build/managed-products";
import { usePmWorkspaces } from "@/hooks/api/build/pm-workspaces";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import type { AccessState } from "@/lib/rbac/gate";
import type { ProjectListResponse } from "@/types/projects";

jest.mock("@/hooks/api/access");
jest.mock("@/hooks/api/build/projects");
jest.mock("@/hooks/api/build/managed-products");
jest.mock("@/hooks/api/build/pm-workspaces");
jest.mock("@/hooks/common/use-debounce");

const mockUseCanState = useCanState as jest.MockedFunction<typeof useCanState>;
const mockUseInfiniteProjects = useInfiniteProjects as jest.MockedFunction<typeof useInfiniteProjects>;
const mockUseManagedProducts = useManagedProducts as jest.MockedFunction<typeof useManagedProducts>;
const mockUsePmWorkspaces = usePmWorkspaces as jest.MockedFunction<typeof usePmWorkspaces>;
const mockUseDebouncedValue = useDebouncedValue as jest.MockedFunction<typeof useDebouncedValue>;

function makeEmptyQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    isSuccess: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

function makeEmptyInfiniteQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    isError: false,
    isSuccess: false,
    hasNextPage: false,
    fetchNextPage: jest.fn().mockResolvedValue(undefined),
    refetch: jest.fn(),
    ...overrides,
  };
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
  mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);
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
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);

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
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isDenied).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading is true and isDenied is false while the access response is still in flight", () => {
    mockUseCanState.mockReturnValue("loading" as AccessState);
    mockUseDebouncedValue.mockReturnValue("");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteProjects>);
    mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);

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
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);

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

describe("BSN-02-014 — hierarchy continuation: no duplicates, cursor reset on filter change", () => {
  test("hasMoreHierarchy is true when workspace page-1 has more and page-2 cursor is not yet loaded", () => {
    setupGrantedAccessMocks();
    mockUsePmWorkspaces.mockReturnValue(
      makeEmptyQuery({
        data: makePmWorkspacesPage(
          [{ pmWorkspaceId: "ws1", name: "WS 1", status: "active" }],
          true,
          "ws-cursor-1",
        ),
        isSuccess: true,
      }) as ReturnType<typeof usePmWorkspaces>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.hasMoreHierarchy).toBe(true);
  });

  test("hasMoreHierarchy is false once workspace page-2 cursor has been loaded (no more after page 2)", () => {
    setupGrantedAccessMocks();
    const p1Data = makePmWorkspacesPage(
      [{ pmWorkspaceId: "ws1", name: "WS 1", status: "active" }],
      true,
      "ws-cursor-1",
    );
    const p2Data = makePmWorkspacesPage(
      [{ pmWorkspaceId: "ws2", name: "WS 2", status: "active" }],
      false,
      null,
    );
    mockUsePmWorkspaces.mockImplementation((params) =>
      params?.cursor === "ws-cursor-1"
        ? (makeEmptyQuery({ data: p2Data, isSuccess: true }) as ReturnType<typeof usePmWorkspaces>)
        : (makeEmptyQuery({ data: p1Data, isSuccess: true }) as ReturnType<typeof usePmWorkspaces>),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    act(() => { result.current.fetchMoreHierarchy(); });

    expect(result.current.hasMoreHierarchy).toBe(false);
  });

  test("workspace rows from page-1 and page-2 combine without duplicates and page-1 rows come first", () => {
    setupGrantedAccessMocks();
    const p1Data = makePmWorkspacesPage(
      [{ pmWorkspaceId: "ws1", name: "WS 1", status: "active" }],
      true,
      "ws-cursor-1",
    );
    const p2Data = makePmWorkspacesPage(
      [{ pmWorkspaceId: "ws2", name: "WS 2", status: "active" }],
      false,
      null,
    );
    mockUsePmWorkspaces.mockImplementation((params) =>
      params?.cursor === "ws-cursor-1"
        ? (makeEmptyQuery({ data: p2Data, isSuccess: true }) as ReturnType<typeof usePmWorkspaces>)
        : (makeEmptyQuery({ data: p1Data, isSuccess: true }) as ReturnType<typeof usePmWorkspaces>),
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    act(() => { result.current.fetchMoreHierarchy(); });

    const wsIds = result.current.workspaces.map((w) => w.id);
    const uniqueIds = [...new Set(wsIds)];
    expect(wsIds).toEqual(uniqueIds);
    expect(wsIds[0]).toBe("ws1");
    expect(wsIds[1]).toBe("ws2");
  });

  test("changing the search term resets the workspace page-2 cursor so page-2 entries from the old search do not appear in the new search results", () => {
    mockUseCanState.mockReturnValue("granted" as AccessState);
    mockUseDebouncedValue.mockReturnValue("alpha");
    mockUseInfiniteProjects.mockReturnValue(makeEmptyInfiniteQuery() as ReturnType<typeof useInfiniteProjects>);
    mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);

    const p1AlphaData = makePmWorkspacesPage(
      [{ pmWorkspaceId: "ws-alpha", name: "Alpha WS", status: "active" }],
      true,
      "ws-cursor-1",
    );
    const p2AlphaData = makePmWorkspacesPage(
      [{ pmWorkspaceId: "ws-alpha-2", name: "Alpha WS 2", status: "active" }],
      false,
      null,
    );
    const p1BetaData = makePmWorkspacesPage(
      [{ pmWorkspaceId: "ws-beta", name: "Beta WS", status: "active" }],
      false,
      null,
    );

    mockUsePmWorkspaces.mockImplementation((params) => {
      if (params?.search === "beta")
        return makeEmptyQuery({ data: p1BetaData, isSuccess: true }) as ReturnType<typeof usePmWorkspaces>;
      if (params?.cursor === "ws-cursor-1")
        return makeEmptyQuery({ data: p2AlphaData, isSuccess: true }) as ReturnType<typeof usePmWorkspaces>;
      return makeEmptyQuery({ data: p1AlphaData, isSuccess: true }) as ReturnType<typeof usePmWorkspaces>;
    });

    const { result, rerender } = renderHook(
      ({ search }: { search: string }) => useBuildScopeDirectory(search, false),
      { initialProps: { search: "alpha" } },
    );

    act(() => { result.current.fetchMoreHierarchy(); });

    const beforeIds = result.current.workspaces.map((w) => w.id);
    expect(beforeIds).toContain("ws-alpha");
    expect(beforeIds).toContain("ws-alpha-2");

    mockUseDebouncedValue.mockReturnValue("beta");
    rerender({ search: "beta" });

    const afterIds = result.current.workspaces.map((w) => w.id);
    expect(afterIds).toContain("ws-beta");
    expect(afterIds).not.toContain("ws-alpha-2");
  });
});
