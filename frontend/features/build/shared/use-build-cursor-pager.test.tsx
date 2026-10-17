import { renderHook, act } from "@testing-library/react";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/releases",
  useSearchParams: () => mockSearchParams,
}));

import {
  useBuildCursorPager,
  BUILD_CURSOR_STACK_PARAM,
} from "./use-build-cursor-pager";

function urlOf(call: number): URLSearchParams {
  const target = mockReplace.mock.calls[call]?.[0] as string | undefined;
  return new URLSearchParams((target ?? "").split("?")[1] ?? "");
}

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
});

describe("a Build cursor walk survives a reload, because its stack is in the URL and not in component state", () => {
  it("starts on the first page with no cursor and no previous, and writes nothing until asked", () => {
    const { result } = renderHook(() => useBuildCursorPager());

    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("writes the next cursor into the URL rather than keeping it in state, so a reload lands on the same page", () => {
    const { result } = renderHook(() => useBuildCursorPager());

    act(() => result.current.goNext("Y3Vyc29yLTE"));

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(urlOf(0).get(BUILD_CURSOR_STACK_PARAM)).toBe('["Y3Vyc29yLTE"]');
  });

  it("reads an existing stack out of the URL, so the page a shared link points at is the page that renders", () => {
    mockSearchParams = new URLSearchParams({
      [BUILD_CURSOR_STACK_PARAM]: '["one","two"]',
    });

    const { result } = renderHook(() => useBuildCursorPager());

    expect(result.current.cursor).toBe("two");
    expect(result.current.hasPrevious).toBe(true);
  });

  it("keeps the whole walk so previous can step back one page at a time, which a single stored cursor could not do", () => {
    mockSearchParams = new URLSearchParams({
      [BUILD_CURSOR_STACK_PARAM]: '["one","two","three"]',
    });

    const { result } = renderHook(() => useBuildCursorPager());
    act(() => result.current.goPrevious());

    expect(urlOf(0).get(BUILD_CURSOR_STACK_PARAM)).toBe('["one","two"]');
  });

  it("drops the parameter entirely on the way back to the first page, so a first-page URL carries no pagination noise", () => {
    mockSearchParams = new URLSearchParams({
      [BUILD_CURSOR_STACK_PARAM]: '["one"]',
    });

    const { result } = renderHook(() => useBuildCursorPager());
    act(() => result.current.goPrevious());

    expect(urlOf(0).has(BUILD_CURSOR_STACK_PARAM)).toBe(false);
  });

  it("ignores goNext with no cursor, so the last page cannot push a dead entry onto the walk", () => {
    const { result } = renderHook(() => useBuildCursorPager());

    act(() => result.current.goNext(null));
    act(() => result.current.goNext(undefined));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("preserves the other query parameters it finds, so paging does not discard an active filter or search term", () => {
    mockSearchParams = new URLSearchParams({ status: "draft", q: "api" });

    const { result } = renderHook(() => useBuildCursorPager());
    act(() => result.current.goNext("next-1"));

    const written = urlOf(0);
    expect(written.get("status")).toBe("draft");
    expect(written.get("q")).toBe("api");
    expect(written.get(BUILD_CURSOR_STACK_PARAM)).toBe('["next-1"]');
  });

  it("round-trips a cursor holding characters a delimiter-joined format would split on", () => {
    mockSearchParams = new URLSearchParams();
    const awkward = 'a,b~c"d]e';
    const { result } = renderHook(() => useBuildCursorPager());

    act(() => result.current.goNext(awkward));

    mockSearchParams = new URLSearchParams({
      [BUILD_CURSOR_STACK_PARAM]: urlOf(0).get(BUILD_CURSOR_STACK_PARAM) ?? "",
    });
    const { result: reloaded } = renderHook(() => useBuildCursorPager());

    expect(reloaded.current.cursor).toBe(awkward);
  });

  it("falls back to the first page on a malformed stack instead of throwing, because a hand-edited URL is a client problem", () => {
    mockSearchParams = new URLSearchParams({
      [BUILD_CURSOR_STACK_PARAM]: "not-json",
    });

    const { result } = renderHook(() => useBuildCursorPager());

    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);
  });

  it("clears the walk when the reset key changes, so changing a filter cannot leave page 3's cursor applied to page 1's results", () => {
    mockSearchParams = new URLSearchParams({
      [BUILD_CURSOR_STACK_PARAM]: '["one","two"]',
    });

    const { rerender } = renderHook(({ key }: { key: string }) => useBuildCursorPager(key), {
      initialProps: { key: "status=open" },
    });
    rerender({ key: "status=closed" });

    expect(urlOf(0).has(BUILD_CURSOR_STACK_PARAM)).toBe(false);
  });
});
