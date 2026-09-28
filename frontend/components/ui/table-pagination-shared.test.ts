import { act, renderHook } from "@testing-library/react";
import { useCursorPager } from "./table-pagination-shared";

describe("useCursorPager — URL-backed opt-in", () => {
  it("initialises from the provided cursor so a deep-linked page-2 URL starts at the correct position", () => {
    const onCursorChange = jest.fn();
    const { result } = renderHook(() =>
      useCursorPager(undefined, { initialCursor: "cursor-abc", onCursorChange }),
    );

    expect(result.current.cursor).toBe("cursor-abc");
    expect(result.current.hasPrevious).toBe(true);
  });

  it("calls onCursorChange with the new cursor after goNext, so the caller can write the URL param", () => {
    const onCursorChange = jest.fn();
    const { result } = renderHook(() =>
      useCursorPager(undefined, { initialCursor: undefined, onCursorChange }),
    );

    act(() => result.current.goNext("cursor-p2"));

    expect(onCursorChange).toHaveBeenCalledWith("cursor-p2");
    expect(result.current.cursor).toBe("cursor-p2");
  });

  it("calls onCursorChange with undefined after goPrevious, so the URL cursor param is cleared at page 1", () => {
    const onCursorChange = jest.fn();
    const { result } = renderHook(() =>
      useCursorPager(undefined, { initialCursor: "cursor-p2", onCursorChange }),
    );

    act(() => result.current.goPrevious());

    expect(onCursorChange).toHaveBeenCalledWith(undefined);
    expect(result.current.cursor).toBeUndefined();
  });

  it("does not call onCursorChange on mount — the cursor is already in the URL at deep-link time", () => {
    const onCursorChange = jest.fn();
    renderHook(() =>
      useCursorPager(undefined, { initialCursor: "cursor-p2", onCursorChange }),
    );

    expect(onCursorChange).not.toHaveBeenCalled();
  });

  it("calls onCursorChange with undefined when the reset key changes, so the URL cursor is cleared on filter change", () => {
    const onCursorChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) =>
        useCursorPager(key, { initialCursor: undefined, onCursorChange }),
      { initialProps: { key: "status=OPEN" } },
    );

    act(() => result.current.goNext("cursor-p2"));
    onCursorChange.mockClear();

    rerender({ key: "status=CLOSED" });

    expect(result.current.cursor).toBeUndefined();
    expect(onCursorChange).toHaveBeenCalledWith(undefined);
  });

  it("emits once per cursor change even when the caller passes a fresh inline callback on every render, because a URL write that re-renders the caller would otherwise re-enter forever", () => {
    const received: (string | undefined)[] = [];
    const { result, rerender } = renderHook(() =>
      useCursorPager(undefined, {
        initialCursor: undefined,
        onCursorChange: (cursor) => received.push(cursor),
      }),
    );

    act(() => result.current.goNext("cursor-p2"));
    rerender();
    rerender();

    expect(received).toEqual(["cursor-p2"]);
  });
});

describe("useCursorPager — opted-out (default) callers are unchanged", () => {
  it("navigates pages in local state only and never invokes any URL-write callback", () => {
    const { result } = renderHook(() => useCursorPager());

    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);

    act(() => result.current.goNext("c1"));
    expect(result.current.cursor).toBe("c1");
    expect(result.current.hasPrevious).toBe(true);

    act(() => result.current.goPrevious());
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);
  });

  it("resets on key change without requiring any URL infrastructure", () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useCursorPager(key),
      { initialProps: { key: "status=OPEN" } },
    );

    act(() => result.current.goNext("c1"));
    expect(result.current.cursor).toBe("c1");

    rerender({ key: "status=CLOSED" });

    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);
  });
});
