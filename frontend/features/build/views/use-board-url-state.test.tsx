import { renderHook, act } from "@testing-library/react";
import type { ChangeEvent } from "react";

let mockSearchParams = new URLSearchParams();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/build/1/issues",
}));

const mockCreateViewMutate = jest.fn();
const mockUpdateViewMutate = jest.fn();
let mockViews: unknown[] = [];
let mockBoardTickets: unknown[] = [];

jest.mock("@/hooks/api", () => ({
  useProject: () => ({
    data: { id: 1, key: "TEST", name: "Test", members: [], statuses: [] },
  }),
}));

jest.mock("@/hooks/api/build", () => ({
  useViews: () => ({ data: mockViews }),
  useCreateView: () => ({ mutate: mockCreateViewMutate, isPending: false }),
  useUpdateView: () => ({ mutate: mockUpdateViewMutate, isPending: false }),
  useProjectBoardTickets: () => ({
    data: mockBoardTickets,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    isTruncated: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
  }),
}));

let mockQaMatches: Array<{ id: number }> | undefined = undefined;
const mockUseBugs = jest.fn();

jest.mock("@/hooks/api/build/bugs", () => ({
  useBugs: (projectId?: number, filters?: Record<string, string | undefined>) => {
    mockUseBugs(projectId, filters);
    return { data: mockQaMatches, isLoading: false };
  },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { useBoardUrlState } from "./use-board-url-state";
import { DEFAULT_DISPLAY_OPTIONS } from "./display-options-panel";

function nameEvent(value: string) {
  return { target: { value } } as ChangeEvent<HTMLInputElement>;
}

function setParams(init: Record<string, string>) {
  mockSearchParams = new URLSearchParams(init);
  const qs = mockSearchParams.toString();
  window.history.replaceState({}, "", qs ? `/?${qs}` : "/");
}

beforeEach(() => {
  mockViews = [];
  mockBoardTickets = [];
  mockQaMatches = undefined;
  mockUseBugs.mockClear();
  setParams({});
  mockReplace.mockClear();
  mockPush.mockClear();
  mockCreateViewMutate.mockClear();
  mockUpdateViewMutate.mockClear();
  localStorage.clear();
});

describe("useBoardUrlState — saving a view persists every filter the board was showing", () => {
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
    mockBoardTickets = [
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
});

describe("useBoardUrlState — Calendar has one canonical owner", () => {
  it("normalizes an Issues calendar deep link to the unified Calendar without rendering the local calendar layout", () => {
    mockViews = [
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

describe("useBoardUrlState — an applied saved view can be updated in place from the board", () => {
  it("patches the active view with the filters, layout and display options currently on screen", () => {
    mockViews = [
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

describe("useBoardUrlState — QA filters replace the standalone Bugs page", () => {
  it("does not query the bugs endpoint when no QA filter is set", () => {
    setParams({ type: "BUG" });

    renderHook(() => useBoardUrlState(1));

    expect(mockUseBugs).toHaveBeenCalledWith(undefined, {
      severity: undefined,
      status: undefined,
    });
  });

  it("does not query the bugs endpoint when a severity is set but the list is not scoped to bugs", () => {
    setParams({ severity: "blocker" });

    renderHook(() => useBoardUrlState(1));

    expect(mockUseBugs).toHaveBeenCalledWith(undefined, {
      severity: "blocker",
      status: undefined,
    });
  });

  it("queries the bugs endpoint with severity and QA state once the list is scoped to bugs", () => {
    setParams({ type: "BUG", severity: "blocker", qaState: "ready_for_qa" });

    renderHook(() => useBoardUrlState(1));

    expect(mockUseBugs).toHaveBeenCalledWith(1, {
      severity: "blocker",
      status: "ready_for_qa",
    });
  });

  it("counts a severity filter as an active filter so the empty state explains itself", () => {
    setParams({ type: "BUG", severity: "blocker" });

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("clears severity and QA state alongside the other filters", () => {
    setParams({ type: "BUG", severity: "blocker", qaState: "verified" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleClearSearch();
    });

    const written = new URLSearchParams(mockReplace.mock.calls[0][0].slice(1));
    expect(written.get("severity")).toBeNull();
    expect(written.get("qaState")).toBeNull();
  });

  it("writes a QA filter to the URL so a filtered defect list is shareable", () => {
    setParams({ type: "BUG" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleQaFilterChange("severity", "critical");
    });

    const written = new URLSearchParams(mockReplace.mock.calls[0][0].slice(1));
    expect(written.get("severity")).toBe("critical");
  });

  it("removes a QA filter from the URL when it is set back to any", () => {
    setParams({ type: "BUG", severity: "critical" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleQaFilterChange("severity", "");
    });

    const written = new URLSearchParams(mockReplace.mock.calls[0][0].slice(1));
    expect(written.get("severity")).toBeNull();
  });

  it("carries severity and QA state into a saved view so a defect view reopens filtered", () => {
    setParams({ type: "BUG", severity: "major", qaState: "reopened" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleSaveViewNameChange(nameEvent("Open majors"));
    });
    act(() => {
      result.current.handleSaveView();
    });

    const payload = mockCreateViewMutate.mock.calls[0][0] as {
      filters: Record<string, string>;
    };
    expect(payload.filters.severity).toBe("major");
    expect(payload.filters.qaState).toBe("reopened");
  });
});
