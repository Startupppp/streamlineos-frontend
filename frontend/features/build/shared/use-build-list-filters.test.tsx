import { act, renderHook } from "@testing-library/react";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
  type BuildListFilterDefinition,
} from "./use-build-list-filters";

const replace = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/build/bugs",
  useSearchParams: () => currentParams,
}));

const FILTERS: readonly BuildListFilterDefinition[] = [
  { param: "status", options: ["all", "open", "closed"] },
  { param: "severity" },
];

function setUrl(query: string) {
  currentParams = new URLSearchParams(query);
}

function lastParams(): URLSearchParams {
  const url = String(replace.mock.calls.at(-1)?.[0] ?? "");
  return new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");
}

beforeEach(() => {
  jest.useFakeTimers();
  replace.mockClear();
  setUrl("");
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useBuildListFilters", () => {
  it("reads every filter from the URL", () => {
    setUrl("status=open&severity=high&q=login");
    const { result } = renderHook(() => useBuildListFilters({ filters: FILTERS }));
    expect(result.current.value("status")).toBe("open");
    expect(result.current.value("severity")).toBe("high");
    expect(result.current.search).toBe("login");
    expect(result.current.activeCount).toBe(2);
    expect(result.current.isFiltered).toBe(true);
  });

  it("falls back to the sentinel for a value the enum refuses", () => {
    setUrl("status=exploded");
    const { result } = renderHook(() => useBuildListFilters({ filters: FILTERS }));
    expect(result.current.value("status")).toBe(BUILD_FILTER_ALL);
    expect(result.current.isActive("status")).toBe(false);
  });

  it("removes the param instead of writing the all sentinel", () => {
    setUrl("status=open");
    const { result } = renderHook(() => useBuildListFilters({ filters: FILTERS }));
    act(() => result.current.setValue("status", BUILD_FILTER_ALL));
    expect(lastParams().has("status")).toBe(false);
  });

  it("writes a real value to the URL", () => {
    const { result } = renderHook(() => useBuildListFilters({ filters: FILTERS }));
    act(() => result.current.setValue("status", "closed"));
    expect(lastParams().get("status")).toBe("closed");
  });

  it("drops the cursor and page when a filter changes", () => {
    setUrl("cursor=abc&page=4&status=open");
    const { result } = renderHook(() => useBuildListFilters({ filters: FILTERS }));
    act(() => result.current.setValue("status", "closed"));
    const params = lastParams();
    expect(params.has("cursor")).toBe(false);
    expect(params.has("page")).toBe(false);
  });

  it("writes and clears a keyset cursor without disturbing active filters", () => {
    setUrl("q=login&status=open");
    const { result } = renderHook(() => useBuildListFilters({ filters: FILTERS }));
    act(() => result.current.setCursor("cursor-2"));
    expect(lastParams().toString()).toBe("q=login&status=open&cursor=cursor-2");
    act(() => result.current.setCursor(null));
    expect(lastParams().toString()).toBe("q=login&status=open");
  });

  it("holds a keystroke out of the URL until the debounce elapses", () => {
    const { result } = renderHook(() => useBuildListFilters({ filters: FILTERS }));
    act(() => result.current.setSearch("lo"));
    expect(replace).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(replace).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(lastParams().get("q")).toBe("lo");
  });

  it("clears every filter and the search in one write", () => {
    setUrl("status=open&severity=high&q=login&cursor=abc");
    const { result } = renderHook(() => useBuildListFilters({ filters: FILTERS }));
    act(() => result.current.clearAll());
    const params = lastParams();
    expect(params.has("status")).toBe(false);
    expect(params.has("severity")).toBe(false);
    expect(params.has("q")).toBe(false);
    expect(params.has("cursor")).toBe(false);
    expect(result.current.search).toBe("");
  });

  it("changes its reset key whenever the query behind a cursor changes", () => {
    setUrl("status=open");
    const { result, rerender } = renderHook(() =>
      useBuildListFilters({ filters: FILTERS }),
    );
    const before = result.current.resetKey;
    setUrl("status=closed");
    rerender();
    expect(result.current.resetKey).not.toBe(before);
  });

  it("follows the URL when history moves under it", () => {
    setUrl("q=login");
    const { result, rerender } = renderHook(() =>
      useBuildListFilters({ filters: FILTERS }),
    );
    expect(result.current.search).toBe("login");
    setUrl("");
    rerender();
    expect(result.current.search).toBe("");
  });

  it("leaves the URL alone for a surface with no search", () => {
    const { result } = renderHook(() =>
      useBuildListFilters({ filters: FILTERS, withSearch: false }),
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(replace).not.toHaveBeenCalled();
    expect(result.current.isFiltered).toBe(false);
  });
});
