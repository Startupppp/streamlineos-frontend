import type { ReactNode, HTMLAttributes } from "react";
import { act, render, screen } from "@testing-library/react";
import { format, subDays } from "date-fns";
import { CommandCenterPage } from "./command-center-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

let mockSearchParams = new URLSearchParams();
const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn() }),
  usePathname: () => "/build/command-center",
}));

jest.mock("./command-center-toolbar", () => ({
  CommandCenterToolbar: () => <div data-testid="command-center-toolbar" />,
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: jest.fn(() => "/build/1/tickets/T-1"),
}));

jest.mock("@/components/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: jest.fn(),
}));

jest.mock("@/hooks/api/build/all-work", () => ({
  useInfiniteAllWork: jest.fn(),
  useAllWork: jest.fn(),
  COMMAND_CENTER_MY_ISSUES_FILTERS: { scope: "mine", limit: 20 },
}));

jest.mock("@/components/command-palette/hooks/use-command-palette", () => ({
  useCommandPalette: () => ({ openCreateTicket: jest.fn() }),
}));

jest.mock("@/features/build/project-create/project-create-wizard", () => ({
  ProjectCreateWizard: () => null,
}));

const mockUseKeyboardShortcuts = jest.fn();
jest.mock("./use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: (...args: unknown[]) => mockUseKeyboardShortcuts(...args),
}));

jest.mock("./command-center-actions", () => ({
  QuickCreateMenu: () => null,
  PinnedNav: () => <div data-testid="pinned-nav" />,
  CreateIssueButton: () => null,
}));

jest.mock("./command-center-my-issues-panel", () => ({
  MyIssuesPanel: () => <div data-testid="my-issues-panel" />,
}));

jest.mock("./command-center-projects-panel", () => ({
  ProjectsPanel: () => <div data-testid="projects-panel" />,
}));

jest.mock("./command-center-approvals-panel", () => ({
  ApprovalsPanel: () => <div data-testid="approvals-panel" />,
}));

jest.mock("./command-center-agent-runs-panel", () => ({
  AgentRunsPanel: () => <div data-testid="agent-runs-panel" />,
}));

jest.mock("./command-center-risks-panel", () => ({
  RisksPanel: () => <div data-testid="risks-panel" />,
}));

jest.mock("./command-center-releases-panel", () => ({
  ReleasesPanel: () => <div data-testid="releases-panel" />,
}));

jest.mock("./command-center-rows", () => ({
  BlockersPanel: () => <div data-testid="blockers-panel" />,
  MyWorkRow: () => null,
  CommandCenterRow: () => null,
  ProjectCard: () => null,
  projectHealthClasses: () => "",
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PM_PANEL: "",
}));

jest.mock("@/lib/motion-presets", () => ({
  pmSnappy: {},
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    p: ({ children, ...rest }: HTMLAttributes<HTMLParagraphElement>) => <p {...rest}>{children}</p>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
  }: {
    children: ReactNode;
    title?: string;
    contentClassName?: string;
    actions?: ReactNode;
    subtitle?: string;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="stat-card">{label}{value}</div>
  ),
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-card-grid-skeleton" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description, onRetry }: { description?: string; onRetry?: () => void }) => (
    <div data-testid="error-state">
      {description}
      {onRetry ? <button onClick={onRetry}>Retry</button> : null}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

import { useCan, useAccess } from "@/hooks/api/access";
import { useProjects } from "@/hooks/api/build/projects";
import { useInfiniteAllWork, useAllWork } from "@/hooks/api/build/all-work";

const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseProjects = useProjects as jest.Mock;
const mockUseInfiniteAllWork = useInfiniteAllWork as jest.Mock;
const mockUseAllWork = useAllWork as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};

function baseProjectsResult(overrides: Record<string, unknown> = {}) {
  return {
    data: { data: [], hasMore: false, total: 0 },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

function baseInfiniteResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjects.mockReturnValue(baseProjectsResult());
  mockUseInfiniteAllWork.mockReturnValue(baseInfiniteResult());
  mockUseAllWork.mockReturnValue({ data: undefined, refetch: jest.fn() });
  mockUseOnlineStatus.mockReturnValue(true);
  mockUseKeyboardShortcuts.mockReset();
  mockRouterPush.mockClear();
  mockSearchParams = new URLSearchParams();
});

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
  mockSearchParams = new URLSearchParams("scope=all");
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
  mockSearchParams = new URLSearchParams("scope=invalid-value");
  render(<CommandCenterPage />);
  expect(mockUseInfiniteAllWork).toHaveBeenCalledWith(
    expect.objectContaining({ scope: "mine" }),
    expect.anything(),
  );
});

it("passes the owner URL param as managerId to useProjects so the project list is filtered by manager", () => {
  mockSearchParams = new URLSearchParams("owner=user-abc");
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
  mockSearchParams = new URLSearchParams("health=at_risk");
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
  mockSearchParams = new URLSearchParams("health=exploding");
  render(<CommandCenterPage />);
  const [filters] = mockUseProjects.mock.calls.at(-1) as [Record<string, unknown>];
  expect("health" in filters).toBe(false);
});

it("passes a due-date window to useInfiniteAllWork when the due URL param is present, so the spec's due parameter is deep-linkable", () => {
  mockSearchParams = new URLSearchParams("due=overdue");
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
  mockSearchParams = new URLSearchParams("due=next-decade");
  render(<CommandCenterPage />);
  expect(mockUseInfiniteAllWork).toHaveBeenCalledWith(
    expect.not.objectContaining({ dueDateTo: expect.anything() }),
    expect.anything(),
  );
});

it("keeps the Overdue statistic read on the overdue window even when due=today narrows the panel, so the stat is not zeroed by the panel filter", () => {
  mockSearchParams = new URLSearchParams("due=today");
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

describe("CommandCenterPage — FE-41: error forwarding to usePageState", () => {
  it("shows the page-level error state and hides all panels when the projects query fails with a 500 so a broken query is not silently swallowed as an empty dashboard", () => {
    mockUseProjects.mockReturnValue(
      baseProjectsResult({
        data: undefined,
        isError: true,
        error: new ApiError("Internal server error", 500, "INTERNAL_ERROR"),
      }),
    );
    render(<CommandCenterPage />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("my-issues-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("projects-panel")).not.toBeInTheDocument();
  });

  it("renders all panels without an error state when the projects query succeeds — positive control for the 500 error test above", () => {
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("my-issues-panel")).toBeInTheDocument();
    expect(screen.getByTestId("projects-panel")).toBeInTheDocument();
  });
});

describe("CommandCenterPage — Enter opens the focused personal-queue row", () => {
  function keyboardOptions() {
    const { useBuildListKeyboard } = jest.requireMock(
      "@/hooks/common/use-build-list-keyboard",
    ) as { useBuildListKeyboard: jest.Mock };
    return useBuildListKeyboard.mock.calls.at(-1)?.[0] as {
      itemCount: number;
      onOpen: (index: number) => void;
    };
  }

  function renderWithOneIssue() {
    mockUseInfiniteAllWork.mockReturnValue(
      baseInfiniteResult({
        data: {
          pages: [
            {
              data: [
                {
                  id: 11,
                  ticketNumber: 3,
                  title: "Fix the thing",
                  status: "TODO",
                  priority: "HIGH",
                  type: "TASK",
                  projectId: 1,
                  projectKey: "P",
                  projectName: "Proj",
                  dueDate: null,
                  assigneeId: null,
                },
              ],
              total: 1,
            },
          ],
        },
      }),
    );
    render(<CommandCenterPage />);
  }

  it("counts the personal-queue rows for j/k, so the cursor has something to move over", () => {
    renderWithOneIssue();
    expect(keyboardOptions().itemCount).toBe(1);
  });

  it("navigates to the focused issue when Enter fires, so the shortcut is not a no-op handler", () => {
    renderWithOneIssue();
    act(() => {
      keyboardOptions().onOpen(0);
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/build/1/tickets/T-1");
  });

  it("navigates nowhere when the focused index is past the end of the queue", () => {
    renderWithOneIssue();
    act(() => {
      keyboardOptions().onOpen(9);
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

describe("CommandCenterPage — persona-based panel gating", () => {
  it("hides ApprovalsPanel when the actor lacks build:approvals:view — paired with the granted test below", () => {
    mockUseCan.mockImplementation((key: string) => key !== "build:approvals:view");
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("approvals-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-runs-panel")).toBeInTheDocument();
  });

  it("shows ApprovalsPanel when the actor has build:approvals:view — paired with the denied test above", () => {
    mockUseCan.mockReturnValue(true);
    render(<CommandCenterPage />);
    expect(screen.getByTestId("approvals-panel")).toBeInTheDocument();
    expect(screen.getByTestId("agent-runs-panel")).toBeInTheDocument();
  });

  it("hides RisksPanel when the actor lacks build:risks:view — paired with the granted test below", () => {
    mockUseCan.mockImplementation((key: string) => key !== "build:risks:view");
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("risks-panel")).not.toBeInTheDocument();
  });

  it("shows RisksPanel when the actor has build:risks:view — paired with the denied test above", () => {
    mockUseCan.mockReturnValue(true);
    render(<CommandCenterPage />);
    expect(screen.getByTestId("risks-panel")).toBeInTheDocument();
  });

  it("shows BlockersPanel when the actor has build:tickets:view — paired with the hidden test below", () => {
    mockUseCan.mockReturnValue(true);
    render(<CommandCenterPage />);
    expect(screen.getByTestId("blockers-panel")).toBeInTheDocument();
  });

  it("hides BlockersPanel and AgentRunsPanel when the actor lacks build:tickets:view — paired with the shown test above", () => {
    mockUseCan.mockImplementation((key: string) => key !== "build:tickets:view");
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("blockers-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-runs-panel")).not.toBeInTheDocument();
  });
});
