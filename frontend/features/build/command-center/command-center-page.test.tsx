import { render, screen } from "@testing-library/react";
import { CommandCenterPage } from "./command-center-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: jest.fn(),
}));

jest.mock("@/hooks/api/build/all-work", () => ({
  useInfiniteAllWork: jest.fn(),
  useAllWork: jest.fn(),
  COMMAND_CENTER_MY_ISSUES_FILTERS: { limit: 20 },
}));

jest.mock("@/components/command-palette/hooks/use-command-palette", () => ({
  useCommandPalette: () => ({ openCreateTicket: jest.fn() }),
}));

jest.mock("@/features/build/project-create/project-create-wizard", () => ({
  ProjectCreateWizard: () => null,
}));

jest.mock("./use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: jest.fn(),
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
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_PANEL: "",
}));

jest.mock("@/lib/motion-presets", () => ({
  pmSnappy: {},
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    p: ({ children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) => <p {...rest}>{children}</p>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
    contentClassName?: string;
    actions?: React.ReactNode;
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
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-card-grid-skeleton" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
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
  mockUseAllWork.mockReturnValue({ data: undefined });
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
