import { act, renderHook } from "@testing-library/react";
import {
  applyRoleListParamUpdates,
  useRoleListState,
} from "./use-role-list-state";

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/settings/roles",
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

describe("role list URL state", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("preserves unrelated URL state while applying list updates", () => {
    expect(
      applyRoleListParamUpdates("tab=details&page=4&size=50", {
        page: null,
        search: "finance",
      }),
    ).toBe("tab=details&size=50&search=finance");
  });

  it("builds an exact server query from URL state", () => {
    mockSearchParams = new URLSearchParams(
      "page=3&size=50&search=Finance",
    );

    const { result } = renderHook(() => useRoleListState());

    expect(result.current.query).toEqual({
      page: 3,
      limit: 50,
      search: "Finance",
    });
  });

  it("resets the page when page size changes", () => {
    mockSearchParams = new URLSearchParams("page=4&size=50&tab=details");
    const { result } = renderHook(() => useRoleListState());

    act(() => result.current.setPageSize(100));

    const href = String(mockReplace.mock.calls.at(-1)?.[0]);
    const params = new URL(href, "https://example.test").searchParams;
    expect(params.get("page")).toBeNull();
    expect(params.get("size")).toBe("100");
    expect(params.get("tab")).toBe("details");
  });

  it("debounces server search and resets the page", () => {
    jest.useFakeTimers();
    mockSearchParams = new URLSearchParams("page=4&size=50");
    const { result } = renderHook(() => useRoleListState());

    act(() => result.current.setSearch("  Finance  "));
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(300));

    const href = String(mockReplace.mock.calls.at(-1)?.[0]);
    const params = new URL(href, "https://example.test").searchParams;
    expect(params.get("page")).toBeNull();
    expect(params.get("size")).toBe("50");
    expect(params.get("search")).toBe("Finance");
  });
});
