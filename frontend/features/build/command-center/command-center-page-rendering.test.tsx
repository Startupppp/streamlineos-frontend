import { act, render, screen } from "@testing-library/react";
import { format, subDays } from "date-fns";
import "./command-center-page-test-harness";
import {
  mockUseOnlineStatus,
  mockUseKeyboardShortcuts,
  mockSearchParamsRef,
} from "./command-center-page-test-harness";
import {
  installCommandCenterMocks,
  mockUseCan,
  mockUseAccess,
  mockUseProjects,
  mockUseInfiniteAllWork,
  mockUseAllWork,
  baseProjectsResult,
  baseInfiniteResult,
} from "./command-center-page-test-fixtures";
import { CommandCenterPage } from "./command-center-page";
import { ApiError } from "@/lib/api-envelope";

beforeEach(installCommandCenterMocks);

it("renders the page skeleton and not the ready panels while the access snapshot is still loading because useCan returns false before access lands and a disabled query yields empty not loading", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseCan.mockReturnValue(false);
  mockUseProjects.mockReturnValue(
    baseProjectsResult({
      data: { data: [{ id: 1, name: "Proj", key: "P", status: "ACTIVE", progress: { total: 0, percentage: 0 }, description: null, hasMore: false }], hasMore: false, total: 1 },
    }),
  );
  render(<CommandCenterPage />);
  expect(screen.getByTestId("stat-card-grid-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("my-issues-panel")).not.toBeInTheDocument();
});

it("keeps the Command Center available when the projects query is rejected", () => {
  mockUseProjects.mockReturnValue(
    baseProjectsResult({
      data: undefined,
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<CommandCenterPage />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Command Center" })).toBeInTheDocument();
  expect(screen.queryByText("Projects Error")).not.toBeInTheDocument();
});

it("renders the canonical Command Center heading", () => {
  render(<CommandCenterPage />);
  expect(screen.getByRole("heading", { name: "Command Center" })).toBeInTheDocument();
});

it("keeps project failures out of the page-level error boundary", () => {
  const refetchProjects = jest.fn();
  mockUseProjects.mockReturnValue(
    baseProjectsResult({
      data: undefined,
      isError: true,
      error: new ApiError("Request failed", 500, "INTERNAL_ERROR"),
      refetch: refetchProjects,
    }),
  );
  render(<CommandCenterPage />);
  expect(screen.getByRole("heading", { name: "Command Center" })).toBeInTheDocument();
  expect(screen.queryByText("Projects Error")).not.toBeInTheDocument();
  expect(mockUseProjects).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ throwOnError: false }),
  );
  expect(refetchProjects).not.toHaveBeenCalled();
});

it("uses the first My Work page total for the Open Issues statistic without a second summary request", () => {
  mockUseInfiniteAllWork.mockReturnValue(
    baseInfiniteResult({
      data: { pages: [{ data: [], total: 7 }], pageParams: [undefined] },
    }),
  );
  mockUseAllWork.mockReturnValue({ data: { data: [], total: 2 }, refetch: jest.fn() });
  const callsBefore = mockUseAllWork.mock.calls.length;

  render(<CommandCenterPage />);

  expect(screen.getAllByTestId("stat-card")[1]).toHaveTextContent("Open issues7");
  expect(mockUseAllWork).toHaveBeenCalledTimes(callsBefore + 1);
});

it("renders both MyIssuesPanel and ProjectsPanel when projects and issues data are empty, confirming the page-level empty state is delegated to the panels themselves", () => {
  render(<CommandCenterPage />);
  expect(screen.getByTestId("my-issues-panel")).toBeInTheDocument();
  expect(screen.getByTestId("projects-panel")).toBeInTheDocument();
});

it("renders the Access Restricted state when the user lacks build:view and does not render the ready panels", () => {
  mockUseAccess.mockReturnValue({
    data: { isOrgOwner: false, scopes: {}, modules: {} },
    isLoading: false,
  });
  mockUseCan.mockReturnValue(false);
  render(<CommandCenterPage />);
  expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  expect(screen.queryByTestId("my-issues-panel")).not.toBeInTheDocument();
  expect(screen.queryByTestId("projects-panel")).not.toBeInTheDocument();
});

it("shows the offline banner when the device is offline, confirming useOnlineStatus drives the indicator", () => {
  mockUseOnlineStatus.mockReturnValue(false);
  render(<CommandCenterPage />);
  expect(screen.getByText(/You are offline/)).toBeInTheDocument();
});

it("does not show the offline banner when the device is online — paired with the offline test above", () => {
  mockUseOnlineStatus.mockReturnValue(true);
  render(<CommandCenterPage />);
  expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument();
});

it("passes onShortcutHelp to useKeyboardShortcuts so the ? key can open the help overlay", () => {
  render(<CommandCenterPage />);
  expect(mockUseKeyboardShortcuts).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    expect.any(Function),
  );
});

it("ShortcutHelpDialog is not shown on initial render before the ? callback fires — paired with the open test below", () => {
  render(<CommandCenterPage />);
  expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
});

it("the onShortcutHelp callback passed to the keyboard hook opens the shortcut help dialog when called", async () => {
  render(<CommandCenterPage />);
  const capturedOnShortcutHelp = mockUseKeyboardShortcuts.mock.calls[0]?.[2] as () => void;
  expect(typeof capturedOnShortcutHelp).toBe("function");
  await act(async () => { capturedOnShortcutHelp(); });
  expect(screen.getByTestId("shortcut-help-dialog")).toBeInTheDocument();
});

it("passes scope from the URL to useInfiniteAllWork, overriding the default mine scope", () => {
  mockSearchParamsRef.current = new URLSearchParams("scope=all");
  render(<CommandCenterPage />);
  expect(mockUseInfiniteAllWork).toHaveBeenCalledWith(
    expect.objectContaining({ scope: "all" }),
    expect.anything(),
  );
});

it("uses the default mine scope when no scope param is in the URL — paired with the scope-all test above", () => {
  render(<CommandCenterPage />);
  expect(mockUseInfiniteAllWork).toHaveBeenCalledWith(
    expect.objectContaining({ scope: "mine" }),
    expect.anything(),
  );
});

it("ignores an invalid scope URL param and falls back to the default mine scope", () => {
  mockSearchParamsRef.current = new URLSearchParams("scope=invalid-value");
  render(<CommandCenterPage />);
  expect(mockUseInfiniteAllWork).toHaveBeenCalledWith(
    expect.objectContaining({ scope: "mine" }),
    expect.anything(),
  );
});

it("passes the owner URL param as managerId to useProjects so the project list is filtered by manager", () => {
  mockSearchParamsRef.current = new URLSearchParams("owner=user-abc");
  render(<CommandCenterPage />);
  expect(mockUseProjects).toHaveBeenCalledWith(
    expect.objectContaining({ managerId: "user-abc" }),
    expect.objectContaining({ throwOnError: false }),
  );
});

it("passes no managerId to useProjects when the owner param is absent — paired with the owner-present test above", () => {
  render(<CommandCenterPage />);
  expect(mockUseProjects).toHaveBeenCalledWith(
    expect.objectContaining({ managerId: undefined }),
    expect.objectContaining({ throwOnError: false }),
  );
});

it("passes the health URL param to useProjects, so the spec's health parameter filters server-side rather than inside one keyset page", () => {
  mockSearchParamsRef.current = new URLSearchParams("health=at_risk");
  render(<CommandCenterPage />);
  expect(mockUseProjects).toHaveBeenCalledWith(
    expect.objectContaining({ health: "at_risk" }),
    expect.objectContaining({ throwOnError: false }),
  );
});

it("passes no health to useProjects when the health param is absent — paired with the health-present test above", () => {
  render(<CommandCenterPage />);
  const [filters] = mockUseProjects.mock.calls.at(-1) as [Record<string, unknown>];
  expect("health" in filters).toBe(false);
});

it("ignores an unknown health value instead of forwarding it to a strict backend schema that would 400", () => {
  mockSearchParamsRef.current = new URLSearchParams("health=exploding");
  render(<CommandCenterPage />);
  const [filters] = mockUseProjects.mock.calls.at(-1) as [Record<string, unknown>];
  expect("health" in filters).toBe(false);
});

it("passes a due-date window to useInfiniteAllWork when the due URL param is present, so the spec's due parameter is deep-linkable", () => {
  mockSearchParamsRef.current = new URLSearchParams("due=overdue");
  render(<CommandCenterPage />);
  expect(mockUseInfiniteAllWork).toHaveBeenCalledWith(
    expect.objectContaining({
      dueDateTo: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    }),
    expect.anything(),
  );
});

it("passes no due-date window to useInfiniteAllWork when the due param is absent — paired control for the due-present test above", () => {
  render(<CommandCenterPage />);
  expect(mockUseInfiniteAllWork).toHaveBeenCalledWith(
    expect.not.objectContaining({ dueDateTo: expect.anything() }),
    expect.anything(),
  );
});

it("ignores a due URL param outside the declared enum so a hand-edited URL cannot shape the read", () => {
  mockSearchParamsRef.current = new URLSearchParams("due=next-decade");
  render(<CommandCenterPage />);
  expect(mockUseInfiniteAllWork).toHaveBeenCalledWith(
    expect.not.objectContaining({ dueDateTo: expect.anything() }),
    expect.anything(),
  );
});

it("keeps the Overdue statistic read on the overdue window even when due=today narrows the panel, so the stat is not zeroed by the panel filter", () => {
  mockSearchParamsRef.current = new URLSearchParams("due=today");
  render(<CommandCenterPage />);
  expect(mockUseAllWork).toHaveBeenCalledWith(
    expect.not.objectContaining({ dueDateFrom: expect.anything() }),
    expect.anything(),
  );
  expect(mockUseAllWork).toHaveBeenCalledWith(
    expect.objectContaining({
      dueDateTo: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    }),
    expect.anything(),
  );
});

it("renders ApprovalsPanel, AgentRunsPanel, RisksPanel and ReleasesPanel alongside the existing panels in the ready state", () => {
  render(<CommandCenterPage />);
  expect(screen.getByTestId("approvals-panel")).toBeInTheDocument();
  expect(screen.getByTestId("agent-runs-panel")).toBeInTheDocument();
  expect(screen.getByTestId("risks-panel")).toBeInTheDocument();
  expect(screen.getByTestId("releases-panel")).toBeInTheDocument();
});

it("does not render the four new panels when the user lacks build:view — paired with the ready-state render test above", () => {
  mockUseAccess.mockReturnValue({
    data: { isOrgOwner: false, scopes: {}, modules: {} },
    isLoading: false,
  });
  mockUseCan.mockReturnValue(false);
  render(<CommandCenterPage />);
  expect(screen.queryByTestId("approvals-panel")).not.toBeInTheDocument();
  expect(screen.queryByTestId("agent-runs-panel")).not.toBeInTheDocument();
  expect(screen.queryByTestId("risks-panel")).not.toBeInTheDocument();
  expect(screen.queryByTestId("releases-panel")).not.toBeInTheDocument();
});
