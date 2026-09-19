import { renderHook } from "@testing-library/react";
import { useBuildScopeDirectory } from "./use-build-scope-directory";
import { useCanState } from "@/hooks/api/access";
import { useProjects } from "@/hooks/api/build/projects";
import { useManagedProducts } from "@/hooks/api/build/managed-products";
import { usePmWorkspaces } from "@/hooks/api/build/pm-workspaces";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import type { AccessState } from "@/lib/rbac/gate";

jest.mock("@/hooks/api/access");
jest.mock("@/hooks/api/build/projects");
jest.mock("@/hooks/api/build/managed-products");
jest.mock("@/hooks/api/build/pm-workspaces");
jest.mock("@/hooks/common/use-debounce");

const mockUseCanState = useCanState as jest.MockedFunction<typeof useCanState>;
const mockUseProjects = useProjects as jest.MockedFunction<typeof useProjects>;
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

function setupGrantedAccessMocks(debounced = "") {
  mockUseCanState.mockReturnValue("granted" as AccessState);
  mockUseDebouncedValue.mockReturnValue(debounced);
  mockUseProjects.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useProjects>);
  mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
  mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BSN-02-015 — stale request isolation via debounced search", () => {
  test("useProjects receives the debounced search term, not the raw keystroke value", () => {
    mockUseCanState.mockReturnValue("granted" as AccessState);
    mockUseDebouncedValue.mockReturnValue("debounced");
    mockUseProjects.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useProjects>);
    mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);

    renderHook(() => useBuildScopeDirectory("raw-rapidly-typed", false));

    const projectCalls = mockUseProjects.mock.calls;
    const displayCall = projectCalls.find((args) => args[0]?.search !== undefined);
    expect(displayCall?.[0]).toMatchObject({ search: "debounced" });
  });

  test("with empty debounced value, useProjects is called without a search param so no request fires for blank queries", () => {
    setupGrantedAccessMocks("");

    renderHook(() => useBuildScopeDirectory("", false));

    const projectCalls = mockUseProjects.mock.calls;
    const callWithSearch = projectCalls.find((args) => args[0]?.search !== undefined);
    expect(callWithSearch).toBeUndefined();
  });
});

describe("BSN-02-016 — isRefreshing signals a background fetch without destroying results", () => {
  test("isRefreshing is true when a display query is fetching but has existing data", () => {
    setupGrantedAccessMocks();
    mockUseProjects.mockReturnValue(
      makeEmptyQuery({ isFetching: true, isLoading: false, data: { data: [], hasMore: false } }) as ReturnType<typeof useProjects>,
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
    mockUseProjects.mockReturnValue(
      makeEmptyQuery({ isFetching: true, isLoading: true }) as ReturnType<typeof useProjects>,
    );

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isRefreshing).toBe(false);
  });
});

describe("BSN-02-017 — isDenied and isLoading correctly distinguish access states", () => {
  test("isDenied is true when the access response says the user lacks build:view", () => {
    mockUseCanState.mockReturnValue("denied" as AccessState);
    mockUseDebouncedValue.mockReturnValue("");
    mockUseProjects.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useProjects>);
    mockUseManagedProducts.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useManagedProducts>);
    mockUsePmWorkspaces.mockReturnValue(makeEmptyQuery() as ReturnType<typeof usePmWorkspaces>);

    const { result } = renderHook(() => useBuildScopeDirectory("", false));

    expect(result.current.isDenied).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading is true and isDenied is false while the access response is still in flight", () => {
    mockUseCanState.mockReturnValue("loading" as AccessState);
    mockUseDebouncedValue.mockReturnValue("");
    mockUseProjects.mockReturnValue(makeEmptyQuery() as ReturnType<typeof useProjects>);
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
