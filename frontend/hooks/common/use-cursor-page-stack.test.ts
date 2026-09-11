import { act, renderHook } from "@testing-library/react";
import { useCursorPageStack } from "./use-cursor-page-stack";

describe("useCursorPageStack", () => {
  it("starts on page one with no cursor and no previous page", () => {
    const { result } = renderHook(() => useCursorPageStack());

    expect(result.current.cursor).toBeUndefined();
    expect(result.current.page).toBe(1);
    expect(result.current.hasPrevious).toBe(false);
  });

  it("advances through cursors and back again", () => {
    const { result } = renderHook(() => useCursorPageStack());

    act(() => result.current.goToNextPage("cursor-2"));
    expect(result.current.cursor).toBe("cursor-2");
    expect(result.current.page).toBe(2);
    expect(result.current.hasPrevious).toBe(true);

    act(() => result.current.goToNextPage("cursor-3"));
    expect(result.current.cursor).toBe("cursor-3");
    expect(result.current.page).toBe(3);

    act(() => result.current.goToPreviousPage());
    expect(result.current.cursor).toBe("cursor-2");
    expect(result.current.page).toBe(2);

    act(() => result.current.goToPreviousPage());
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.page).toBe(1);
    expect(result.current.hasPrevious).toBe(false);
  });

  it("never walks before the first page", () => {
    const { result } = renderHook(() => useCursorPageStack());

    act(() => result.current.goToPreviousPage());
    act(() => result.current.goToPreviousPage());

    expect(result.current.page).toBe(1);
    expect(result.current.cursor).toBeUndefined();
  });

  it("truncates forward history when a new page is opened after going back", () => {
    const { result } = renderHook(() => useCursorPageStack());

    act(() => result.current.goToNextPage("cursor-2"));
    act(() => result.current.goToNextPage("cursor-3"));
    act(() => result.current.goToPreviousPage());
    act(() => result.current.goToNextPage("cursor-3-refetched"));

    expect(result.current.cursor).toBe("cursor-3-refetched");
    expect(result.current.page).toBe(3);
  });

  it("normalizes a null next cursor to undefined", () => {
    const { result } = renderHook(() => useCursorPageStack());

    act(() => result.current.goToNextPage(null));

    expect(result.current.cursor).toBeUndefined();
    expect(result.current.page).toBe(2);
  });

  it("resets to the first page and drops the stack", () => {
    const { result } = renderHook(() => useCursorPageStack());

    act(() => result.current.goToNextPage("cursor-2"));
    act(() => result.current.goToNextPage("cursor-3"));
    act(() => result.current.resetToFirstPage());

    expect(result.current.page).toBe(1);
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.hasPrevious).toBe(false);
  });

  it("keeps resetToFirstPage and goToPreviousPage referentially stable across renders", () => {
    const { result, rerender } = renderHook(() => useCursorPageStack());
    const firstReset = result.current.resetToFirstPage;
    const firstPrevious = result.current.goToPreviousPage;

    rerender();

    expect(result.current.resetToFirstPage).toBe(firstReset);
    expect(result.current.goToPreviousPage).toBe(firstPrevious);
  });
});
