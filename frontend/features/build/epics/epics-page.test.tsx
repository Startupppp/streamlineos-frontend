import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import {
  ACCESS_DENIED,
  ACCESS_LOADING,
  disabledQueryResult,
  makeMutationResult,
  mockUseAccess,
  mockUseBuildListFilters,
  mockUseBuildListKeyboard,
  mockUseCan,
  mockUseEpicPage,
  mockUseOnlineStatus,
  mockUseProject,
  mockUseUpdateTicket,
  readCapturedToolbarFilters,
} from "./epics-page-test-harness";
import {
  EPIC_ROW,
  epicPageResult,
  filtersReturning,
  installEpicsPageMocks,
  params,
  readyPage,
} from "./epics-test-fixtures";
import { EpicsPage } from "./epics-page";
import { ApiError } from "@/lib/api-envelope";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ProjectWithDetails, Ticket } from "@/types/projects";

const epicRow: Ticket = { ...EPIC_ROW, version: 1, health: "at_risk" };

function projectErrorResult(error: Error): UseQueryResult<ProjectWithDetails | null, Error> {
  return {
    data: undefined,
    error,
    isError: true,
    isPending: false,
    isLoading: false,
    isLoadingError: true,
    isRefetchError: false,
    isSuccess: false,
    status: "error",
    fetchStatus: "idle",
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 1,
    failureReason: error,
    errorUpdateCount: 1,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: true,
    isEnabled: true,
    refetch: jest.fn(),
    promise: new Promise<ProjectWithDetails | null>(() => undefined),
  };
}

beforeEach(installEpicsPageMocks);

describe("EpicsPage — every epic filter is asked of the server, not applied to one page of rows", () => {
  it("forwards health, status, owner and the page size, so a filtered page is filtered by the database", async () => {
    readyPage([epicRow]);
    mockUseBuildListFilters.mockReturnValue(
      filtersReturning({ health: "at_risk", status: "IN_PROGRESS", ownerId: "user-3" }),
    );
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(mockUseEpicPage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        health: "at_risk",
        status: "IN_PROGRESS",
        ownerId: "user-3",
        limit: 25,
      }),
    );
  });

  it("forwards no filter value when every control is at its sentinel, so the request is not narrowed by accident", async () => {
    readyPage([epicRow]);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(mockUseEpicPage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        health: undefined,
        status: undefined,
        ownerId: undefined,
        q: undefined,
      }),
    );
  });

  it("renders exactly the epics the server returned, without re-filtering them here", async () => {
    readyPage([]);
    mockUseEpicPage.mockReturnValue(
      epicPageResult([epicRow, { ...epicRow, id: 12, title: "Epic Two" }]),
    );
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getAllByTestId("epic-card")).toHaveLength(2);
  });
});

describe("EpicsPage — the epic page is a URL cursor, so a page is shareable and bounded", () => {
  it("forwards the URL cursor to the epic read", async () => {
    readyPage([epicRow]);
    mockUseBuildListFilters.mockReturnValue({
      ...filtersReturning({}, false),
      cursor: "epic-cursor-1",
    });
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(mockUseEpicPage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ cursor: "epic-cursor-1" }),
    );
  });

  it("writes the server's next cursor to the URL when Next is pressed", async () => {
    const setCursor = jest.fn();
    readyPage([]);
    mockUseEpicPage.mockReturnValue(
      epicPageResult([epicRow], { hasMore: true, nextCursor: "next-epic" }),
    );
    mockUseBuildListFilters.mockReturnValue({ ...filtersReturning({}, false), setCursor });
    await act(async () => { render(<EpicsPage params={params} />); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Next page" })); });
    expect(setCursor).toHaveBeenCalledWith("next-epic");
  });

  it("disables Next when the server says there is no further page", async () => {
    readyPage([]);
    mockUseEpicPage.mockReturnValue(epicPageResult([epicRow]));
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("offers no Previous on a deep-linked cursor, because the page before it was never visited here", async () => {
    readyPage([]);
    mockUseEpicPage.mockReturnValue(
      epicPageResult([epicRow], { hasMore: true, nextCursor: "n" }),
    );
    mockUseBuildListFilters.mockReturnValue({ ...filtersReturning({}, false), cursor: "deep" });
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  it("returns to the cursor it came from when Previous is pressed after a Next", async () => {
    const setCursor = jest.fn();
    readyPage([]);
    mockUseEpicPage.mockReturnValue(
      epicPageResult([epicRow], { hasMore: true, nextCursor: "second" }),
    );
    mockUseBuildListFilters.mockReturnValue({
      ...filtersReturning({}, false),
      cursor: "first",
      setCursor,
    });
    await act(async () => { render(<EpicsPage params={params} />); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Next page" })); });
    const previous = screen.getByRole("button", { name: "Previous page" });
    expect(previous).not.toBeDisabled();
    await act(async () => { fireEvent.click(previous); });
    expect(setCursor).toHaveBeenLastCalledWith("first");
  });

  it("renders no pagination footer when the page holds no epics, so an empty state is not framed as page one of many", async () => {
    readyPage([]);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
  });
});

describe("EpicsPage — dependencies reach the card from the epic row itself", () => {
  it("passes the dependency count the epic endpoint projected on that row", async () => {
    readyPage([]);
    mockUseEpicPage.mockReturnValue(
      epicPageResult([{ ...epicRow, dependencyCount: 3 }]),
    );
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("epic-card")).toHaveAttribute("data-dependency-count", "3");
  });

  it("passes a zero dependency count through as the epic endpoint projected it", async () => {
    readyPage([]);
    mockUseEpicPage.mockReturnValue(epicPageResult([{ ...epicRow, dependencyCount: 0 }]));
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("epic-card")).toHaveAttribute("data-dependency-count", "0");
  });
});

describe("EpicsPage — offline", () => {
  it("shows a dated offline state instead of a first-run empty state when the browser is offline and nothing loaded", async () => {
    mockUseOnlineStatus.mockReturnValue(false);
    readyPage([], Date.now() - 7 * 60 * 1000);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("offline-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("offline-freshness")).toHaveTextContent(/last updated .*7 minutes ago/i);
  });

  it("dates the loaded epics while offline, so a stale list is not read as current", async () => {
    mockUseOnlineStatus.mockReturnValue(false);
    readyPage([epicRow], Date.now() - 2 * 60 * 1000);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("offline-banner-freshness")).toHaveTextContent(/last updated .*2 minutes ago/i);
  });

  it("shows no offline banner while online, so the notice is not always on", async () => {
    readyPage([epicRow], Date.now());
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("offline-state")).not.toBeInTheDocument();
  });
});

describe("EpicsPage — the ? shortcut has a target", () => {
  it("opens the shortcut help dialog when ? fires", async () => {
    readyPage([epicRow]);
    await act(async () => { render(<EpicsPage params={params} />); });
    const calls = mockUseBuildListKeyboard.mock.calls;
    const options = calls[calls.length - 1][0];
    expect(typeof options.onShortcutHelp).toBe("function");
    act(() => { options.onShortcutHelp?.(); });
    expect(screen.getByRole("dialog")).toHaveTextContent(/shortcut/i);
  });

  it("keeps the shortcut help dialog closed until ? fires", async () => {
    readyPage([epicRow]);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("EpicsPage — the status, ownerId and health URL parameters are declared, so they are not stripped to the sentinel", () => {
  it("declares status, ownerId and health to useBuildListFilters, because an undeclared param always reads back as all", async () => {
    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    const options = mockUseBuildListFilters.mock.calls.at(-1)?.[0] as
      | { filters?: readonly { param: string }[] }
      | undefined;
    expect(options?.filters?.map((f) => f.param)).toEqual([
      "status",
      "ownerId",
      "health",
    ]);
  });

  it("renders a control for each declared filter so the parameter is reachable without hand-editing the URL", async () => {
    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    const toolbarFilters = readCapturedToolbarFilters() ?? [];
    expect(toolbarFilters.map((f) => f.id)).toEqual([
      "status",
      "ownerId",
      "health",
    ]);
  });
});

describe("EpicsPage — the c and e shortcuts have a real target", () => {
  const EPIC = {
    id: 3, orgId: "org-1", projectId: 1, title: "Epic C", type: "EPIC",
    status: "TODO", priority: "MEDIUM", ticketNumber: 3, epicId: null,
    reporterId: "user-1", points: null, storyPoints: null, link: null,
    rank: "1002", parentTicketId: null, originalEstimate: null, timeSpent: null,
    startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-3", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
    version: 1,
  };

  it("passes onCreate and onEdit to useBuildListKeyboard when the caller may create and update", async () => {
    readyPage([EPIC]);

    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    const args = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof args?.onCreate).toBe("function");
    expect(typeof args?.onEdit).toBe("function");
  });

  it("passes no onCreate when build:tickets:create is denied, so c cannot open a sheet the caller may not submit", async () => {
    mockUseCan.mockReturnValue(false);
    readyPage([EPIC]);

    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    const args = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(args?.onCreate).toBeUndefined();
  });
});

describe("EpicsPage — the empty state tells a first run apart from a filtered no-result", () => {
  it("offers first-run copy when nothing is filtered and the project has no epics", async () => {
    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    expect(screen.getByTestId("empty-state").textContent).toBe("No epics yet");
  });

  it("says the filters excluded everything when a filter is active and no epic survives it", async () => {
    mockUseBuildListFilters.mockReturnValue({
      search: "", debouncedSearch: "zzz", setSearch: jest.fn(),
      value: jest.fn(() => "all"), isActive: jest.fn(() => false),
      setValue: jest.fn(), clearAll: jest.fn(), activeCount: 0, isFiltered: true,
      cursor: null, setCursor: jest.fn(), resetKey: "", isPending: false,
    });

    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    expect(screen.getByTestId("empty-state").textContent).toBe("No epics match your filters");
  });
});

describe("EpicsPage — linking a story carries the concurrency token", () => {
  it("sends the story's own version with the epic link, because the PATCH is rejected without it", async () => {
    const mutate = jest.fn();
    mockUseUpdateTicket.mockReturnValue({ ...makeMutationResult(), mutate });
    readyPage([
      epicRow,
      { ...epicRow, id: 31, title: "Loose story", type: "STORY", version: 9, epicId: null },
    ]);
    await act(async () => { render(<EpicsPage params={params} />); });
    await act(async () => { fireEvent.click(screen.getAllByTestId("link-story-btn")[0]); });
    expect(mutate).toHaveBeenCalledWith({ ticketId: 31, version: 9, epicId: 11 });
  });

  it("sends nothing when the story is not in the loaded page, rather than a patch with no token", async () => {
    const mutate = jest.fn();
    mockUseUpdateTicket.mockReturnValue({ ...makeMutationResult(), mutate });
    readyPage([epicRow]);
    await act(async () => { render(<EpicsPage params={params} />); });
    await act(async () => { fireEvent.click(screen.getAllByTestId("link-story-btn")[0]); });
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe("EpicsPage — the failure surface carries the request id", () => {
  it("hands the failing error down so the request id reaches the reader rather than only the message", async () => {
    mockUseProject.mockReturnValue(
      projectErrorResult(new ApiError("Epics unavailable", 500, "INTERNAL", { correlationId: "req-epics-7" })),
    );
    readyPage([]);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("error-reference")).toHaveTextContent("req-epics-7");
  });

  it("shows no request id for a failure that carries none, so the reference is never invented", async () => {
    mockUseProject.mockReturnValue(projectErrorResult(new TypeError("Failed to fetch")));
    readyPage([]);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("error-reference")).toHaveTextContent("");
  });
});

describe("EpicsPage — a failed epic read is a failure, not an empty list", () => {
  it("resolves to the error state when the epic read fails even though the project read succeeded", async () => {
    readyPage([]);
    mockUseEpicPage.mockReturnValue(
      epicPageResult([], {
        isError: true,
        error: new ApiError("Epics unavailable", 500, "INTERNAL", { correlationId: "req-epic-page" }),
      }),
    );
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByTestId("error-reference")).toHaveTextContent("req-epic-page");
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("retries the epic read along with the project and board reads", async () => {
    const refetchEpics = jest.fn();
    readyPage([]);
    mockUseEpicPage.mockReturnValue(
      epicPageResult([], { isError: true, error: new Error("boom"), refetch: refetchEpics }),
    );
    await act(async () => { render(<EpicsPage params={params} />); });
    await act(async () => { fireEvent.click(screen.getByTestId("error-retry")); });
    expect(refetchEpics).toHaveBeenCalled();
  });
});
