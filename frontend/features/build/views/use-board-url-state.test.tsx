import { renderHook, act } from "@testing-library/react";
import {
  boardState,
  installBoardUrlStateMocks,
  mockCreateViewMutate,
  mockPush,
  mockReplace,
  mockUpdateViewMutate,
  nameEvent,
  setParams,
  setPathname,
} from "./use-board-url-state-test-harness";
import { useBoardUrlState } from "./use-board-url-state";

beforeEach(installBoardUrlStateMocks);

describe("useBoardUrlState — saving a view persists every filter the board was showing", () => {
  it("fails closed for malformed enum filters instead of sending a request that crashes the page", () => {
    setParams({ priority: "NOT_A_PRIORITY", type: "NOT_A_TYPE" });

    renderHook(() => useBoardUrlState(1));

    expect(boardState.boardFilters).toEqual({
      q: undefined,
      status: undefined,
      priority: undefined,
      type: undefined,
      assigneeId: undefined,
      labels: undefined,
      cycle: undefined,
      module: undefined,
    });
    expect(mockReplace).toHaveBeenCalledWith("/build/1/issues", { scroll: false });
  });

  it("carries the cycle and module filters into the saved view, so re-opening it does not silently widen the result set", () => {
    setParams({
      q: "login",
      status: "In Progress",
      priority: "HIGH",
      type: "BUG",
      assigneeId: "user-1",
      labels: "3",
      cycle: "7",
      module: "44",
    });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleSaveViewNameChange(nameEvent("Sprint 12 bugs"));
    });
    act(() => {
      result.current.handleSaveView();
    });

    expect(mockCreateViewMutate).toHaveBeenCalledTimes(1);
    const payload = mockCreateViewMutate.mock.calls[0][0] as {
      filters: Record<string, string>;
    };
    expect(payload.filters).toEqual({
      q: "login",
      status: "In Progress",
      priority: "HIGH",
      type: "BUG",
      assigneeId: "user-1",
      labels: "3",
      cycle: "7",
      module: "44",
    });
  });

  it("forwards a deep-linked due-date range to the board and saved view", () => {
    setParams({
      dueDateFrom: "2026-01-01",
      dueDateTo: "2026-01-31",
    });

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(boardState.boardFilters).toMatchObject({
      dueDateFrom: "2026-01-01",
      dueDateTo: "2026-01-31",
    });
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.handleSaveViewNameChange(nameEvent("January due dates"));
    });
    act(() => {
      result.current.handleSaveView();
    });

    const payload = mockCreateViewMutate.mock.calls[0][0] as {
      filters: Record<string, string>;
    };
    expect(payload.filters).toEqual({
      dueDateFrom: "2026-01-01",
      dueDateTo: "2026-01-31",
    });
  });

  it("omits filters that are not set rather than writing empty strings the board would later treat as active", () => {
    setParams({ status: "Todo" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleSaveViewNameChange(nameEvent("Todo"));
    });
    act(() => {
      result.current.handleSaveView();
    });

    const payload = mockCreateViewMutate.mock.calls[0][0] as {
      filters: Record<string, string>;
    };
    expect(payload.filters).toEqual({ status: "Todo" });
  });
});

describe("useBoardUrlState — ticket round trips preserve issue collection state", () => {
  it("records the allowlisted issue query when opening a ticket", () => {
    boardState.boardTickets = [
      {
        id: 22,
        ticketNumber: 81,
        title: "Fix login",
        status: "TODO",
        type: "BUG",
        labels: [],
      },
    ];
    setParams({
      viewId: "9",
      view: "list",
      q: "login",
      status: "TODO",
      cycle: "7",
      ticket: "22",
      comment: "8",
      unsafe: "value",
    });

    renderHook(() => useBoardUrlState(1));

    expect(mockReplace).toHaveBeenCalledWith(
      "/build/1/tickets/TEST-81?comment=8&returnTo=%2Fbuild%2F1%2Fissues%3FviewId%3D9%26view%3Dlist%26q%3Dlogin%26status%3DTODO%26cycle%3D7",
    );
  });

  it("preserves list view while a ticket panel URL is open (C12)", () => {
    setPathname("/build/1/tickets/TEST-81");
    setParams({
      returnTo: "/build/1/issues?view=list&status=TODO",
    });

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.view).toBe("list");
    expect(result.current.filterStatus).toBe("TODO");
  });
});

describe("useBoardUrlState — Calendar has one canonical owner", () => {
  it("normalizes an Issues calendar deep link to the unified Calendar without rendering the local calendar layout", () => {
    boardState.views = [
      {
        id: 9,
        name: "Saved list",
        layoutType: "list",
        filters: { status: "DONE" },
        isPinned: false,
      },
    ];
    setParams({ view: "calendar", viewId: "9", status: "TODO" });

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.view).toBe("board");
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenLastCalledWith(
      "/calendar?source=build&projectId=1",
    );
  });

  it("opens the unified Calendar when Calendar is selected from Issues", () => {
    setParams({
      view: "list",
      q: "login",
      status: "TODO",
      cycle: "7",
      viewId: "9",
      ticket: "22",
      comment: "8",
    });

    const { result } = renderHook(() => useBoardUrlState(42));

    act(() => {
      result.current.handleViewChange("calendar");
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/calendar?q=login&status=TODO&cycle=7&source=build&projectId=42",
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("useBoardUrlState — an applied saved view can be updated in place from the board", () => {
  it("patches the active view with the filters, layout and display options currently on screen", () => {
    boardState.views = [
      {
        id: 9,
        name: "Sprint board",
        layoutType: "list",
        filters: {},
        isPinned: false,
      },
    ];
    setParams({
      viewId: "9",
      view: "list",
      status: "Done",
      cycle: "3",
      module: "8",
      groupBy: "assignee",
    });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleUpdateActiveView();
    });

    expect(mockUpdateViewMutate).toHaveBeenCalledTimes(1);
    const payload = mockUpdateViewMutate.mock.calls[0][0] as {
      viewId: number;
      projectId: number;
      filters: Record<string, string>;
      layoutType: string;
      groupBy: string;
      displayOptions: { groupBy: string };
    };
    expect(payload.viewId).toBe(9);
    expect(payload.projectId).toBe(1);
    expect(payload.filters).toEqual({ status: "Done", cycle: "3", module: "8" });
    expect(payload.layoutType).toBe("list");
    expect(payload.groupBy).toBe("assignee");
    expect(payload.displayOptions.groupBy).toBe("assignee");
  });

  it("does nothing when no saved view is applied, so the board cannot overwrite an unrelated view", () => {
    setParams({ status: "Done" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleUpdateActiveView();
    });

    expect(mockUpdateViewMutate).not.toHaveBeenCalled();
  });
});

describe("useBoardUrlState — EPIC tickets are excluded from filteredTickets", () => {
  it("omits EPIC-type tickets from filteredTickets so they do not inflate column counts on the board", () => {
    boardState.boardTickets = [
      { id: 1, ticketNumber: 1, title: "Task A", status: "TODO", type: "TASK", labels: [] },
      { id: 2, ticketNumber: 2, title: "Epic B", status: "TODO", type: "EPIC", labels: [] },
      { id: 3, ticketNumber: 3, title: "Bug C", status: "IN_PROGRESS", type: "BUG", labels: [] },
    ];

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.filteredTickets.map((t) => t.id)).toEqual([1, 3]);
  });

  it("does not remove non-EPIC tickets with the filter", () => {
    boardState.boardTickets = [
      { id: 10, ticketNumber: 10, title: "Story", status: "IN_PROGRESS", type: "STORY", labels: [] },
    ];

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.filteredTickets).toHaveLength(1);
    expect(result.current.filteredTickets[0]?.type).toBe("STORY");
  });
});
