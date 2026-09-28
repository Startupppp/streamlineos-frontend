import { renderHook, act } from "@testing-library/react";
import {
  boardState,
  installBoardUrlStateMocks,
  mockCreateViewMutate,
  mockPush,
  mockReplace,
  mockUpdateViewMutate,
  mockUseBugs,
  nameEvent,
  setParams,
} from "./use-board-url-state-test-harness";
import { useBoardUrlState } from "./use-board-url-state";
import { DEFAULT_DISPLAY_OPTIONS } from "./display-options-panel";

beforeEach(installBoardUrlStateMocks);

describe("useBoardUrlState — grouping, sort and column config survive a copied link", () => {
  it("reads groupBy, orderBy, rowBy, columnBy and completed straight off the URL so a shared link reproduces the sender's grouping", () => {
    setParams({
      groupBy: "assignee",
      orderBy: "priority",
      rowBy: "cycle",
      columnBy: "label",
      completed: "last-week",
    });

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.displayOptions.groupBy).toBe("assignee");
    expect(result.current.displayOptions.orderBy).toBe("priority");
    expect(result.current.displayOptions.rowBy).toBe("cycle");
    expect(result.current.displayOptions.columnBy).toBe("label");
    expect(result.current.displayOptions.completedIssues).toBe("last-week");
  });

  it("takes column visibility from the cols param, so toggling a column off is reproduced for the recipient", () => {
    setParams({ cols: "showId,showStatus" });

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.displayOptions.showId).toBe(true);
    expect(result.current.displayOptions.showStatus).toBe(true);
    expect(result.current.displayOptions.showAssignee).toBe(false);
    expect(result.current.displayOptions.showPriority).toBe(false);
  });

  it("falls back to the localStorage preference for any option the URL does not carry, so existing users keep their saved layout", () => {
    localStorage.setItem(
      "unscoped::streamlineos:projects:display-options:v1:1",
      JSON.stringify({
        ...DEFAULT_DISPLAY_OPTIONS,
        groupBy: "priority",
        orderBy: "dueDate",
      }),
    );
    setParams({ groupBy: "assignee" });

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.displayOptions.groupBy).toBe("assignee");
    expect(result.current.displayOptions.orderBy).toBe("dueDate");
  });

  it("writes the whole display configuration to the URL when it changes, so the address bar is always the shareable state", () => {
    setParams({ view: "list" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.setDisplayOptions({
        ...DEFAULT_DISPLAY_OPTIONS,
        groupBy: "assignee",
        orderBy: "priority",
      });
    });

    expect(mockReplace).toHaveBeenCalled();
    const written = new URLSearchParams(
      (mockReplace.mock.calls.at(-1)?.[0] as string).slice(1),
    );
    expect(written.get("groupBy")).toBe("assignee");
    expect(written.get("orderBy")).toBe("priority");
    expect(written.get("view")).toBe("list");
    expect(written.get("cols")).not.toBeNull();
  });

  it("keeps a deep-linked orderBy=updated on both the query sent to the backend and the display options, because the two read the same param with different vocabularies and the narrower one used to overwrite it", () => {
    setParams({ orderBy: "updated" });

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.boardFilters.orderBy).toBe("updated");
    expect(result.current.displayOptions.orderBy).toBe("updated");
  });

  it("does not rewrite a deep-linked orderBy=updated back to the fallback when any other display option changes", () => {
    setParams({ orderBy: "updated" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.setDisplayOptions({
        ...result.current.displayOptions,
        groupBy: "assignee",
      });
    });

    const written = new URLSearchParams(
      (mockReplace.mock.calls.at(-1)?.[0] as string).slice(1),
    );
    expect(written.get("orderBy")).toBe("updated");
  });

  it("still persists the changed display options to localStorage so the preference outlives the URL", () => {
    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.setDisplayOptions({
        ...DEFAULT_DISPLAY_OPTIONS,
        groupBy: "cycle",
      });
    });

    const stored = localStorage.getItem(
      "unscoped::streamlineos:projects:display-options:v1:1",
    );
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).groupBy).toBe("cycle");
  });
});
