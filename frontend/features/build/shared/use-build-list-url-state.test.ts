import { renderHook, act } from "@testing-library/react";

import {
  BUILD_LIST_FILTER_PARAMS,
  buildListSearchParams,
  clearedListSearchParams,
  parseGrouping,
  parsePriorityParam,
  parseSortDirection,
  parseSortField,
  parseTicketTypeParam,
  useBuildListUrlState,
} from "./use-build-list-url-state";

const replace = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/build/my-work",
  useSearchParams: () => currentParams,
}));

function setUrl(query: string) {
  currentParams = new URLSearchParams(query);
}

beforeEach(() => {
  replace.mockClear();
  setUrl("");
});

describe("parsers reject values the backend enum would refuse", () => {
  it("drops an unknown priority instead of forwarding it", () => {
    expect(parsePriorityParam("URGENT")).toBe("URGENT");
    expect(parsePriorityParam("urgent")).toBe("URGENT");
    expect(parsePriorityParam("CATASTROPHIC")).toBeUndefined();
  });

  it("drops an unknown ticket type instead of forwarding it", () => {
    expect(parseTicketTypeParam("bug")).toBe("BUG");
    expect(parseTicketTypeParam("INCIDENT")).toBeUndefined();
  });

  it("falls back when sort, direction or grouping is not in the enum", () => {
    expect(parseSortField("dueDate", "rank")).toBe("dueDate");
    expect(parseSortField("magic", "rank")).toBe("rank");
    expect(parseSortDirection("asc", "desc")).toBe("asc");
    expect(parseSortDirection("sideways", "desc")).toBe("desc");
    expect(parseGrouping("project", "none")).toBe("project");
    expect(parseGrouping("chaos", "none")).toBe("none");
  });
});

describe("cursor invalidation", () => {
  it("drops the cursor when a filter changes", () => {
    const next = buildListSearchParams(
      new URLSearchParams("cursor=abc&status=OPEN"),
      { status: "DONE" },
    );
    expect(next.get("status")).toBe("DONE");
    expect(next.get("cursor")).toBeNull();
  });

  it("drops the cursor when sort, direction or grouping changes", () => {
    for (const key of ["sort", "dir", "group"]) {
      const next = buildListSearchParams(new URLSearchParams("cursor=abc"), {
        [key]: "updated",
      });
      expect(next.get("cursor")).toBeNull();
    }
  });

  it("keeps the cursor when a non-shaping param changes", () => {
    const next = buildListSearchParams(new URLSearchParams("cursor=abc"), {
      view: "table",
    });
    expect(next.get("cursor")).toBe("abc");
  });

  it("clears every filter param and the cursor but keeps layout params", () => {
    const withEverything = new URLSearchParams(
      `${BUILD_LIST_FILTER_PARAMS.map((param) => `${param}=x`).join("&")}&cursor=abc&view=table&tab=created`,
    );
    const next = clearedListSearchParams(withEverything);
    for (const param of BUILD_LIST_FILTER_PARAMS) {
      expect(next.get(param)).toBeNull();
    }
    expect(next.get("cursor")).toBeNull();
    expect(next.get("view")).toBe("table");
    expect(next.get("tab")).toBe("created");
  });
});

describe("useBuildListUrlState", () => {
  it("forwards every deep-linked filter to the request", () => {
    setUrl(
      "q=login&status=OPEN&priority=high&type=bug&assigneeId=u1&labels=3,4&projectIds=7&cycleId=c9&dueDateFrom=2026-01-01&dueDateTo=2026-02-01",
    );
    const { result } = renderHook(() => useBuildListUrlState());
    expect(result.current.filters).toMatchObject({
      search: "login",
      status: "OPEN",
      priority: "HIGH",
      type: "BUG",
      assigneeId: "u1",
      labelIds: "3,4",
      projectIds: "7",
      cycleId: "c9",
      dueDateFrom: "2026-01-01",
      dueDateTo: "2026-02-01",
    });
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("forwards cycleId, which the previous My Work reader dropped", () => {
    setUrl("cycleId=c9");
    const { result } = renderHook(() => useBuildListUrlState());
    expect(result.current.filters.cycleId).toBe("c9");
  });

  it("sends no cycleId when the canonical cycleId param is absent", () => {
    setUrl("");
    const { result } = renderHook(() => useBuildListUrlState());
    expect(result.current.filters).not.toHaveProperty("cycleId");
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("narrows to a single project when projectId is present", () => {
    setUrl("projectId=42");
    const { result } = renderHook(() => useBuildListUrlState());
    expect(result.current.filters.projectIds).toBe("42");
  });

  it("sends the sort the URL asks for and the default otherwise", () => {
    setUrl("sort=dueDate&dir=asc");
    const { result } = renderHook(() => useBuildListUrlState());
    expect(result.current.filters.orderBy).toBe("dueDate");
    expect(result.current.filters.orderDir).toBe("asc");

    setUrl("");
    const { result: fallback } = renderHook(() =>
      useBuildListUrlState({ defaultSortField: "updated" }),
    );
    expect(fallback.current.filters.orderBy).toBe("updated");
    expect(fallback.current.filters.orderDir).toBe("desc");
  });

  it("carries the cursor into the request so a paginated URL is shareable", () => {
    setUrl("cursor=eyJpZCI6NX0");
    const { result } = renderHook(() => useBuildListUrlState());
    expect(result.current.filters.cursor).toBe("eyJpZCI6NX0");
    expect(result.current.cursor).toBe("eyJpZCI6NX0");
  });

  it("applies scope and workspace narrowing from options, not the URL", () => {
    const { result } = renderHook(() =>
      useBuildListUrlState({ scope: "mine", pmWorkspaceId: "ws-1" }),
    );
    expect(result.current.filters.scope).toBe("mine");
    expect(result.current.filters.pmWorkspaceId).toBe("ws-1");
  });

  it("reports no active filters when only layout params are set", () => {
    setUrl("view=table&group=project&sort=updated&cursor=abc");
    const { result } = renderHook(() => useBuildListUrlState());
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("ignores an out-of-enum priority when deciding filters are active", () => {
    setUrl("priority=CATASTROPHIC");
    const { result } = renderHook(() => useBuildListUrlState());
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filters.priority).toBeUndefined();
  });

  it("replaces the URL without scrolling when a filter changes", () => {
    setUrl("cursor=abc");
    const { result } = renderHook(() => useBuildListUrlState());
    act(() => {
      result.current.setListParams({ status: "OPEN" });
    });
    expect(replace).toHaveBeenCalledWith("/build/my-work?status=OPEN", {
      scroll: false,
    });
  });

  it("keeps the rest of the URL when only the cursor moves", () => {
    setUrl("status=OPEN&view=table");
    const { result } = renderHook(() => useBuildListUrlState());
    act(() => {
      result.current.setCursor("next-page");
    });
    expect(replace).toHaveBeenCalledWith(
      "/build/my-work?status=OPEN&view=table&cursor=next-page",
      { scroll: false },
    );
  });

  it("drops the query string entirely when the last param is cleared", () => {
    setUrl("status=OPEN");
    const { result } = renderHook(() => useBuildListUrlState());
    act(() => {
      result.current.clearFilters();
    });
    expect(replace).toHaveBeenCalledWith("/build/my-work", { scroll: false });
  });
});
