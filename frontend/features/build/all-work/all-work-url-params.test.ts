import { renderHook } from "@testing-library/react";

let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/build/all-work",
}));

jest.mock("@/features/build/shared/use-build-list-url-state", () => ({
  useBuildListUrlState: () => ({
    filters: {},
    grouping: "project",
    sortField: "rank",
    sortDirection: "desc",
    cursor: null,
    hasActiveFilters: false,
    isPending: false,
    setListParams: jest.fn(),
    setCursor: jest.fn(),
  }),
  parsePriorityParam: (v: string | null) => v ?? undefined,
  parseTicketTypeParam: (v: string | null) => v ?? undefined,
  BUILD_LIST_FILTER_PARAMS: ["q", "status", "priority", "type", "assigneeId", "labels", "projectIds", "projectId", "cycleId", "dueDateFrom", "dueDateTo"],
}));

import { useAllWorkFilters } from "./use-all-work-filters";

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
});

describe("useAllWorkFilters — productId and teamId URL params reach AllWorkFilters", () => {
  it("maps productId URL param to managedProductId in filters so the API receives the correct foreign key", () => {
    mockSearchParams = new URLSearchParams("productId=5");

    const { result } = renderHook(() => useAllWorkFilters());

    expect(result.current.filters.managedProductId).toBe(5);
    expect(result.current.productIdFilter).toBe("5");
  });

  it("maps teamId URL param to teamId in filters so the API receives the correct foreign key", () => {
    mockSearchParams = new URLSearchParams("teamId=3");

    const { result } = renderHook(() => useAllWorkFilters());

    expect(result.current.filters.teamId).toBe(3);
    expect(result.current.teamIdFilter).toBe("3");
  });

  it("omits managedProductId and teamId from filters when URL has neither param so no spurious API filter is sent", () => {
    mockSearchParams = new URLSearchParams();

    const { result } = renderHook(() => useAllWorkFilters());

    expect(result.current.filters.managedProductId).toBeUndefined();
    expect(result.current.filters.teamId).toBeUndefined();
    expect(result.current.productIdFilter).toBeNull();
    expect(result.current.teamIdFilter).toBeNull();
  });

  it("marks hasActiveFilters true when productId is set so the clear-filters affordance appears", () => {
    mockSearchParams = new URLSearchParams("productId=5");

    const { result } = renderHook(() => useAllWorkFilters());

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("marks hasActiveFilters true when teamId is set so the clear-filters affordance appears", () => {
    mockSearchParams = new URLSearchParams("teamId=7");

    const { result } = renderHook(() => useAllWorkFilters());

    expect(result.current.hasActiveFilters).toBe(true);
  });
});
