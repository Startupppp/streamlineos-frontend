import { screen, act, fireEvent } from "@testing-library/react";
import {
  captured,
  installWorkloadMocks,
  mockReplace,
  mockUse,
  mockUseBuildListKeyboard,
  mockUseOnlineStatus,
  mockUsePageState,
  mockUseProject,
  mockUseProjectBoardTickets,
  mockUseWorkloadCapacity,
  renderPage,
  setSearchParams,
  READY_PROJECT,
} from "./workload-board-page-test-harness";

beforeEach(installWorkloadMocks);

describe("WorkloadBoardPage — access resolution", () => {
  it("a denied resolution renders the denied surface and not the workload view, so a blank page is never the outcome of a permission check", () => {
    mockUseProject.mockReturnValue({ ...READY_PROJECT, data: undefined });
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:view" });
    renderPage();
    expect(screen.getByTestId("denied-state")).toBeDefined();
    expect(screen.queryByTestId("workload-view")).toBeNull();
  });

  it("an access-check still resolving renders the kanban skeleton and not the workload view, so a permitted user never sees a denial flash", () => {
    mockUseProject.mockReturnValue({ ...READY_PROJECT, isLoading: true });
    mockUsePageState.mockReturnValue({ kind: "loading" });
    renderPage();
    expect(screen.getByTestId("kanban-board-skeleton")).toBeDefined();
    expect(screen.queryByTestId("workload-view")).toBeNull();
  });

  it("a ready resolution renders the workload view and not the skeleton", () => {
    renderPage();
    expect(screen.getByTestId("workload-view")).toBeDefined();
    expect(screen.queryByTestId("kanban-board-skeleton")).toBeNull();
  });
});

describe("WorkloadBoardPage — project error path", () => {
  it("a project read failure renders the ProjectLoadFallback retry surface and not the generic error state", () => {
    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("network error"),
      refetch: jest.fn(),
    });
    renderPage();
    expect(screen.getByTestId("project-load-fallback")).toBeDefined();
    expect(screen.queryByTestId("error-state")).toBeNull();
  });
});

describe("WorkloadBoardPage — usePageState inputs", () => {
  it("passes the error value to usePageState so a 402 shows the upgrade path rather than a generic message (FE-41)", () => {
    const projectErr = new Error("payment required");
    mockUseProject.mockReturnValue({
      ...READY_PROJECT,
      isError: true,
      error: projectErr,
      data: undefined,
    });
    renderPage();
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true, error: projectErr }),
    );
  });
});

describe("WorkloadBoardPage — offline state", () => {
  it("renders the offline empty state and hides the workload view when the device goes offline (CCG-5)", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderPage();
    expect(screen.getByTestId("offline-empty-state")).toBeDefined();
    expect(screen.queryByTestId("workload-view")).toBeNull();
  });

  it("renders the workload view when online and not the offline empty state", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    renderPage();
    expect(screen.getByTestId("workload-view")).toBeDefined();
    expect(screen.queryByTestId("offline-empty-state")).toBeNull();
  });
});

describe("WorkloadBoardPage — keyboard shortcuts", () => {
  it("wires onShortcutHelp to useBuildListKeyboard so the ? key opens the shortcut help dialog (CCG-4)", () => {
    renderPage();
    const call = mockUseBuildListKeyboard.mock.calls[0]?.[0] as {
      onShortcutHelp?: () => void;
    };
    expect(typeof call.onShortcutHelp).toBe("function");
  });

  it("calling onShortcutHelp from useBuildListKeyboard opens the ShortcutHelpDialog", () => {
    renderPage();
    const call = mockUseBuildListKeyboard.mock.calls[0]?.[0] as {
      onShortcutHelp?: () => void;
    };
    act(() => {
      call.onShortcutHelp?.();
    });
    expect(screen.getByTestId("shortcut-help-dialog")).toBeDefined();
  });

  it("wires onCreate to useBuildListKeyboard so the c key opens the create ticket dialog", () => {
    renderPage();
    const call = mockUseBuildListKeyboard.mock.calls[0]?.[0] as {
      onCreate?: () => void;
    };
    expect(typeof call.onCreate).toBe("function");
  });

  it("keyboard is always enabled on the workload page so j/k navigation works immediately", () => {
    renderPage();
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });
});

describe("WorkloadBoardPage — group is deliberately not a parameter because both grid axes are already occupied", () => {
  it("ignores a group query param, since the row axis is already the member and the column axis is the calendar day", () => {
    setSearchParams("group=assignee");
    renderPage();
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      undefined,
    );
    expect(captured.filterBarProps.filters).not.toHaveProperty("group");
  });

  it("ignores group=status and group=priority, which are ticket attributes already expressed as filters rather than a second grid axis", () => {
    setSearchParams("group=status");
    renderPage();
    expect(captured.filterBarProps.filters).not.toHaveProperty("group");
    expect(captured.filterBarProps.filters?.["status"]).toBe("all");
    expect(captured.filterBarProps.filters?.["priority"]).toBe("all");
  });

  it("still honours teamId, the one member-level dimension the page does express, so the group assertions above are not passing merely because the page ignores every query param", () => {
    setSearchParams("group=team&teamId=7");
    renderPage();
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      7,
    );
    expect(captured.filterBarProps.filters?.["teamId"]).toBe("7");
  });
});

describe("WorkloadBoardPage — projectId is the path param and never read from the query string", () => {
  it("ignores a conflicting projectId query param and keeps using the route param, so the path stays the single source of truth", () => {
    setSearchParams("projectId=999");
    mockUse.mockReturnValue({ projectId: "1" });
    renderPage();
    expect(mockUseProject).toHaveBeenCalledWith(1);
    expect(mockUseProjectBoardTickets).toHaveBeenCalledWith(1, expect.anything());
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      undefined,
    );
  });

  it("follows the route param when it changes, proving the id is read from the path rather than hardcoded (positive control)", () => {
    mockUse.mockReturnValue({ projectId: "42" });
    renderPage();
    expect(mockUseProject).toHaveBeenCalledWith(42);
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      42,
      expect.any(String),
      expect.any(String),
      undefined,
    );
  });
});

describe("WorkloadBoardPage — group URL parameter", () => {
  it("passes group=team to the view when the URL asks for it, so a shared link renders the grouped table", () => {
    setSearchParams("group=team");
    renderPage();
    expect(captured.workloadViewGroup).toBe("team");
  });

  it("passes group=none when the URL carries no group — paired with the present case above", () => {
    renderPage();
    expect(captured.workloadViewGroup).toBe("none");
  });

  it("falls back to none for a grouping dimension the view does not implement, rather than rendering an empty table", () => {
    setSearchParams("group=astrology");
    renderPage();
    expect(captured.workloadViewGroup).toBe("none");
  });

  it("renders a grouping control, so the parameter is writable and not a read-only deep link", () => {
    renderPage();
    expect(screen.getByRole("combobox", { name: "Group members by" })).toBeInTheDocument();
  });

  it("writes group=team to the URL when the control selects it", () => {
    renderPage();
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Group members by" }), {
      key: "Enter",
    });
    fireEvent.click(screen.getByRole("option", { name: "Group by team" }));
    expect(String(mockReplace.mock.calls.at(-1)?.[0])).toContain("group=team");
  });

  it("clears the group param when grouping returns to none, so the URL stays clean at the default", () => {
    setSearchParams("group=team");
    renderPage();
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Group members by" }), {
      key: "Enter",
    });
    fireEvent.click(screen.getByRole("option", { name: "No grouping" }));
    expect(String(mockReplace.mock.calls.at(-1)?.[0])).not.toContain("group=");
  });
});
