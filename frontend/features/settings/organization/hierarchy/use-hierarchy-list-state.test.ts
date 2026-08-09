import { act, renderHook } from "@testing-library/react";
import {
  applyHierarchyListParamUpdates,
  hierarchyStatusFromParam,
  useHierarchyListState,
} from "./use-hierarchy-list-state";

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/settings/organization/teams",
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

describe("hierarchy list URL state", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("normalizes the hierarchy status URL value", () => {
    expect(hierarchyStatusFromParam("ARCHIVED")).toBe("ARCHIVED");
    expect(hierarchyStatusFromParam("active")).toBe("CURRENT");
    expect(hierarchyStatusFromParam("disabled")).toBe("CURRENT");
  });

  it("preserves unrelated URL state while applying list updates", () => {
    expect(
      applyHierarchyListParamUpdates("tab=details&page=4&size=50", {
        page: null,
        search: "north",
      }),
    ).toBe("tab=details&size=50&search=north");
  });

  it("builds an exact server query from URL state", () => {
    mockSearchParams = new URLSearchParams(
      "page=3&size=50&status=archived&search=North",
    );

    const { result } = renderHook(() => useHierarchyListState());

    expect(result.current.query).toEqual({
      page: 3,
      limit: 50,
      search: "North",
      status: "ARCHIVED",
    });
  });

  it("resets the page when status or page size changes", () => {
    mockSearchParams = new URLSearchParams("page=4&size=50&tab=details");
    const { result } = renderHook(() => useHierarchyListState());

    act(() => result.current.toggleArchived());
    let href = String(mockReplace.mock.calls.at(-1)?.[0]);
    let params = new URL(href, "https://example.test").searchParams;
    expect(params.get("page")).toBeNull();
    expect(params.get("status")).toBe("archived");
    expect(params.get("size")).toBe("50");
    expect(params.get("tab")).toBe("details");

    act(() => result.current.setPageSize(100));
    href = String(mockReplace.mock.calls.at(-1)?.[0]);
    params = new URL(href, "https://example.test").searchParams;
    expect(params.get("page")).toBeNull();
    expect(params.get("size")).toBe("100");
  });

  it("debounces server search and resets the page", () => {
    jest.useFakeTimers();
    mockSearchParams = new URLSearchParams("page=4&size=50");
    const { result } = renderHook(() => useHierarchyListState());

    act(() => result.current.setSearch("  North  "));
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(300));

    const href = String(mockReplace.mock.calls.at(-1)?.[0]);
    const params = new URL(href, "https://example.test").searchParams;
    expect(params.get("page")).toBeNull();
    expect(params.get("size")).toBe("50");
    expect(params.get("search")).toBe("North");
  });
});
