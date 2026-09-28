import { renderHook } from "@testing-library/react";

let mockSearchParams = new URLSearchParams();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/1/issues",
}));

import { useBoardFilterParams } from "./board-filter-params";

function renderWith(query: string) {
  mockSearchParams = new URLSearchParams(query);
  const view = renderHook(() => useBoardFilterParams());
  const rerenderWith = (nextQuery: string) => {
    mockSearchParams = new URLSearchParams(nextQuery);
    view.rerender();
  };
  return { ...view, rerenderWith };
}

describe("the board's cursor lives in the URL", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads a deep-linked cursor into the read's filters, so a shared position is fetched", () => {
    const { result } = renderWith("cursor=c-900");

    expect(result.current.cursor).toBe("c-900");
    expect(result.current.boardFilters.cursor).toBe("c-900");
  });

  it("sends no cursor when the URL carries none, rather than an empty one", () => {
    const { result } = renderWith("status=OPEN");

    expect(result.current.cursor).toBe("");
    expect(result.current.boardFilters.cursor).toBeUndefined();
  });

  it("does not count the cursor as an active filter, so a shared link is not a filtered-empty state", () => {
    const { result } = renderWith("cursor=c-900");

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.activeFilters).toEqual({});
  });

  it("drops the cursor from the URL when the filter shape changes, because a cursor is valid for one shape only", () => {
    const { rerenderWith } = renderWith("cursor=c-900");
    expect(mockReplace).not.toHaveBeenCalled();

    rerenderWith("cursor=c-900&status=OPEN");

    expect(mockReplace).toHaveBeenCalledWith("/build/1/issues?status=OPEN", {
      scroll: false,
    });
  });

  it("stops using the stale cursor in the same render the shape changes, not one navigation later", () => {
    const { result, rerenderWith } = renderWith("cursor=c-900");

    rerenderWith("cursor=c-900&status=OPEN");

    expect(result.current.boardFilters.cursor).toBeUndefined();
    expect(result.current.boardFilters.status).toBe("OPEN");
  });

  it("drops the cursor when the sort changes too, not only when a filter does", () => {
    const { rerenderWith } = renderWith("cursor=c-900");

    rerenderWith("cursor=c-900&orderBy=updated&orderDir=desc");

    expect(mockReplace).toHaveBeenCalledWith(
      "/build/1/issues?orderBy=updated&orderDir=desc",
      { scroll: false },
    );
  });

  it("keeps the cursor when a param that does not change the page changes", () => {
    const { result, rerenderWith } = renderWith("cursor=c-900&view=board");

    rerenderWith("cursor=c-900&view=list");

    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.boardFilters.cursor).toBe("c-900");
  });

  it("navigates nowhere on a shape change that carried no cursor, so an ordinary filter click is one navigation", () => {
    const { rerenderWith } = renderWith("");

    rerenderWith("status=OPEN");

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
