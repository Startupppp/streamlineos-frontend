import type { ReactNode, HTMLAttributes } from "react";
import { act, render, screen } from "@testing-library/react";
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
jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/features/build/shared/shortcut-help-dialog", () => ({
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
  StatCard: ({ label }: { label: string }) => <div data-testid="stat-card">{label}</div>,
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

it("renders the plan upgrade link the backend sent with a 402 MODULE_NOT_ENABLED instead of a generic error when the projects query is rejected", () => {
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
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the canonical Command Center heading", () => {
  render(<CommandCenterPage />);
  expect(screen.getByRole("heading", { name: "Command Center" })).toBeInTheDocument();
});

it("retries both server-derived summary queries with the page retry action", () => {
  const refetchOpenIssues = jest.fn();
  const refetchOverdueIssues = jest.fn();
  const refetchProjects = jest.fn();
  mockUseAllWork
    .mockReturnValueOnce({ data: undefined, refetch: refetchOpenIssues })
    .mockReturnValueOnce({ data: undefined, refetch: refetchOverdueIssues });
  mockUseProjects.mockReturnValue(
    baseProjectsResult({
      data: undefined,
      isError: true,
      error: new ApiError("Request failed", 500, "INTERNAL_ERROR"),
      refetch: refetchProjects,
    }),
  );
  render(<CommandCenterPage />);
  const retryButton = screen.getByRole("button", { name: /retry/i });
  expect(retryButton).toBeInTheDocument();
  retryButton.click();
  expect(refetchProjects).toHaveBeenCalledTimes(1);
  expect(refetchOpenIssues).toHaveBeenCalledTimes(1);
  expect(refetchOverdueIssues).toHaveBeenCalledTimes(1);
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
