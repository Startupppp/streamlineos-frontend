import { act, renderHook } from "@testing-library/react";
import { useOpportunityDiscoveryFilters } from "./use-opportunity-discovery-filters";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/managed-products/1/insights",
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

const filterStore: Record<string, string> = {};
let clearAllCalled = false;

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: jest.fn(() => ({
    cursor: null,
    value: (param: string) => filterStore[param] ?? "all",
    isActive: (param: string) => (filterStore[param] ?? "all") !== "all",
    setValue: (param: string, value: string) => { filterStore[param] = value; },
    setValues: (vals: Record<string, string>) => { Object.assign(filterStore, vals); },
    clearAll: () => {
      Object.keys(filterStore).forEach((k) => delete filterStore[k]);
      clearAllCalled = true;
    },
    activeCount: 0,
    isFiltered: false,
    resetKey: "",
    isPending: false,
    setCursor: jest.fn(),
  })),
  BUILD_FILTER_ALL: "all",
}));

jest.mock("@/hooks/api/feedbucket", () => ({
  useFeedbucketSubmissionFacets: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: { data: [] } })),
}));

jest.mock("@/hooks/api/build/product-discovery", () => ({
  useEvidenceThemes: jest.fn(() => ({
    data: {
      themes: [
        { theme: "Performance", count: 5, latestAt: null, sentimentBreakdown: { positive: 0, neutral: 0, negative: 0, mixed: 0 }, opportunityCount: 2, trend: [] },
        { theme: "Reliability", count: 3, latestAt: null, sentimentBreakdown: { positive: 0, neutral: 0, negative: 0, mixed: 0 }, opportunityCount: 1, trend: [] },
        { theme: null, count: 1, latestAt: null, sentimentBreakdown: { positive: 0, neutral: 0, negative: 0, mixed: 0 }, opportunityCount: 0, trend: [] },
      ],
      suggestedThemes: [],
    },
  })),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

beforeEach(() => {
  Object.keys(filterStore).forEach((k) => delete filterStore[k]);
  clearAllCalled = false;
});

describe("useOpportunityDiscoveryFilters — cursor pagination history (BT-opp-cursor-pager)", () => {
  it("starts on page 1 with no cursor so the first request fetches from the beginning", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.oppQueryParams.cursor).toBeUndefined();
  });

  it("advances to page 2 with the correct cursor so the request fetches the second page", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.goToNextPage("cursor-p2"));

    expect(result.current.pageNumber).toBe(2);
    expect(result.current.hasPreviousPage).toBe(true);
    expect(result.current.oppQueryParams.cursor).toBe("cursor-p2");
  });

  it("advances to page 3 with a distinct cursor so each page request is unique", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.goToNextPage("cursor-p2"));
    act(() => result.current.goToNextPage("cursor-p3"));

    expect(result.current.pageNumber).toBe(3);
    expect(result.current.oppQueryParams.cursor).toBe("cursor-p3");
  });

  it("navigates back from page 3 to page 2 restoring the page-2 cursor so the API fetches the same rows", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.goToNextPage("cursor-p2"));
    act(() => result.current.goToNextPage("cursor-p3"));
    act(() => result.current.goToPreviousPage());

    expect(result.current.pageNumber).toBe(2);
    expect(result.current.oppQueryParams.cursor).toBe("cursor-p2");
  });

  it("navigates back from page 2 to page 1 with no cursor so the first page is requested again", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.goToNextPage("cursor-p2"));
    act(() => result.current.goToPreviousPage());

    expect(result.current.pageNumber).toBe(1);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.oppQueryParams.cursor).toBeUndefined();
  });

  it("page number and cursor agree at every step of a three-page forward and back walk", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    expect(result.current.pageNumber).toBe(1);
    expect(result.current.oppQueryParams.cursor).toBeUndefined();

    act(() => result.current.goToNextPage("cursor-p2"));
    expect(result.current.pageNumber).toBe(2);
    expect(result.current.oppQueryParams.cursor).toBe("cursor-p2");

    act(() => result.current.goToNextPage("cursor-p3"));
    expect(result.current.pageNumber).toBe(3);
    expect(result.current.oppQueryParams.cursor).toBe("cursor-p3");

    act(() => result.current.goToPreviousPage());
    expect(result.current.pageNumber).toBe(2);
    expect(result.current.oppQueryParams.cursor).toBe("cursor-p2");

    act(() => result.current.goToPreviousPage());
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.oppQueryParams.cursor).toBeUndefined();
  });

  it("does not walk before page 1 so Previous on the first page is a no-op", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.goToPreviousPage());
    act(() => result.current.goToPreviousPage());

    expect(result.current.pageNumber).toBe(1);
    expect(result.current.oppQueryParams.cursor).toBeUndefined();
  });

  it("resets to page 1 with no cursor when a filter changes so the first page of filtered results is fetched", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.goToNextPage("cursor-p2"));
    act(() => result.current.goToNextPage("cursor-p3"));
    expect(result.current.pageNumber).toBe(3);

    act(() => result.current.handleStateChange("identified"));

    expect(result.current.pageNumber).toBe(1);
    expect(result.current.oppQueryParams.cursor).toBeUndefined();
  });

  it("clearAll resets cursor and page to 1 so the unfiltered first page is loaded", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.goToNextPage("cursor-p2"));
    act(() => result.current.clearAll());

    expect(result.current.pageNumber).toBe(1);
    expect(result.current.oppQueryParams.cursor).toBeUndefined();
  });
});

describe("useOpportunityDiscoveryFilters — theme filter (BT-opp-theme-filter)", () => {
  it("exposes theme options derived from evidence themes data excluding null themes", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));
    expect(result.current.themeOptions).toContainEqual({ value: "all", label: "All themes" });
    expect(result.current.themeOptions).toContainEqual({ value: "Performance", label: "Performance" });
    expect(result.current.themeOptions).toContainEqual({ value: "Reliability", label: "Reliability" });
    const nullTheme = result.current.themeOptions.find((o) => o.value === null);
    expect(nullTheme).toBeUndefined();
  });

  it("adds theme to oppQueryParams when a non-all value is selected", () => {
    filterStore["oppTheme"] = "Performance";
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    expect(result.current.themeFilter).toBe("Performance");
    expect(result.current.oppQueryParams.theme).toBe("Performance");
  });

  it("omits theme from oppQueryParams when filter is all", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));
    expect(result.current.oppQueryParams.theme).toBeUndefined();
  });

  it("theme change resets pagination to page 1", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.goToNextPage("cursor-p2"));
    act(() => result.current.handleThemeChange("Performance"));

    expect(result.current.pageNumber).toBe(1);
    expect(result.current.oppQueryParams.cursor).toBeUndefined();
  });
});

describe("useOpportunityDiscoveryFilters — scoreMax filter (BT-opp-scoremax-filter)", () => {
  it("adds scoreMax to oppQueryParams when a non-all value is set", () => {
    filterStore["oppScoreMax"] = "100";
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    expect(result.current.scoreMaxFilter).toBe("100");
    expect(result.current.oppQueryParams.scoreMax).toBe("100");
  });

  it("omits scoreMax from oppQueryParams when filter is all", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));
    expect(result.current.oppQueryParams.scoreMax).toBeUndefined();
  });

  it("scoreMin and scoreMax both appear in oppQueryParams when both are active", () => {
    filterStore["oppScoreMin"] = "25";
    filterStore["oppScoreMax"] = "100";
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    expect(result.current.oppQueryParams.scoreMin).toBe("25");
    expect(result.current.oppQueryParams.scoreMax).toBe("100");
  });

  it("clearAll removes both scoreMin and scoreMax from oppQueryParams on next render", () => {
    filterStore["oppScoreMin"] = "25";
    filterStore["oppScoreMax"] = "100";
    const { result, rerender } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.clearAll());
    rerender();

    expect(result.current.oppQueryParams.scoreMin).toBeUndefined();
    expect(result.current.oppQueryParams.scoreMax).toBeUndefined();
    expect(clearAllCalled).toBe(true);
  });

  it("scoreMax change resets pagination to page 1", () => {
    const { result } = renderHook(() => useOpportunityDiscoveryFilters(1));

    act(() => result.current.goToNextPage("cursor-p2"));
    act(() => result.current.handleScoreMaxChange("50"));

    expect(result.current.pageNumber).toBe(1);
    expect(result.current.oppQueryParams.cursor).toBeUndefined();
  });
});
