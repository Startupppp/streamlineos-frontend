import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { GoalsPage } from "./goals-page";

jest.mock("@/hooks/api/goals", () => ({
  useGoal: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, error: undefined })),
  useGoals: jest.fn(),
  useGoalsPage: jest.fn(),
  useGoalStats: jest.fn(),
  useDeleteGoal: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/hooks/common/use-query-param-open", () => {
  const { useState } = require("react");
  return {
    useQueryParamOpen: () => {
      const [open, setOpen] = useState(false);
      return { open, onOpenChange: (v: boolean) => setOpen(v), setOpen: () => setOpen(true) };
    },
  };
});

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    actions,
  }: {
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => <div data-testid="stat-card" />,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmStaggerList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PM_FILL_PANEL: "",
  PM_PANEL: "",
  PM_TOOLBAR: "",
}));

jest.mock("@/features/build/goals/goal-form-sheet", () => ({
  GoalFormSheet: ({ open }: { open?: boolean }) =>
    open ? <div data-testid="goal-form-sheet" /> : null,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/features/build/goals/constants", () => ({
  STATUS_CONFIG: {
    not_started: { variant: "outline", label: "Not started" },
    on_track: { variant: "outline", label: "On track" },
    at_risk: { variant: "outline", label: "At risk" },
    off_track: { variant: "outline", label: "Off track" },
    completed: { variant: "outline", label: "Completed" },
  },
  LEVEL_LABEL: { company: "Company", team: "Team", individual: "Individual" },
  STATUS_OPTIONS: [],
  LEVEL_OPTIONS: [],
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/goals",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({
    ...props
  }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
  EllipsisIcon: () => null,
}));

jest.mock("@/lib/motion-presets", () => ({
  fadeUp: {},
  fadeUpReduced: {},
  listItem: {},
  listItemReduced: {},
  pmSnappy: {},
  pmStagger: () => ({}),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: {},
  }),
}));

jest.mock("@/components/illustrations", () => ({
  EmptyTargetIllustration: () => <svg data-testid="illustration" />,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

import { useGoals, useGoalsPage, useGoalStats } from "@/hooks/api/goals";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseGoals = useGoals as jest.Mock;
const mockUseGoalsPage = useGoalsPage as jest.Mock;
const mockUseGoalStats = useGoalStats as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_LOADING = { data: undefined, isLoading: true };
const ACCESS_GRANTED = {
  data: {
    isOrgOwner: false,
    scopes: { "build:goals:view": "all", "build:goals:manage": "all" },
    modules: { BUILD: true },
  },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: { BUILD: true } },
  isLoading: false,
};

function disabledQueryResult() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseGoals.mockReturnValue({ data: [], isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
  mockUseGoalsPage.mockReturnValue({
    data: { items: [], page: 1, pageSize: 24, total: 0, totalPages: 0 },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseGoalStats.mockReturnValue({ data: undefined });
});

it("shows skeleton not empty state while access snapshot is still in flight because useGatedQuery disables the query until snapshot lands", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseGoalsPage.mockReturnValue(disabledQueryResult());

  render(<GoalsPage />);

  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("shows NoPermissionState not empty state when build:goals:view is denied", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseGoalsPage.mockReturnValue(disabledQueryResult());

  render(<GoalsPage />);

  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("hides the New Goal control when build:goals:manage is denied, because a create control must not offer authority the caller may not hold", () => {
  mockUseCan.mockReturnValue(false);

  render(<GoalsPage />);

  expect(screen.queryByText("New Goal")).not.toBeInTheDocument();
});

it("shows the New Goal control when build:goals:manage is granted", () => {
  render(<GoalsPage />);

  expect(screen.getAllByText("New Goal")[0]).toBeInTheDocument();
});

describe("GoalsPage — keyboard shortcuts (BSN-FE-K4)", () => {
  it("c shortcut opens the create form sheet", () => {
    render(<GoalsPage />);
    fireEvent.keyDown(document, { key: "c" });

    expect(screen.getByTestId("goal-form-sheet")).toBeInTheDocument();
  });

  it("e shortcut opens the edit form sheet for the focused goal", () => {
    const { useGoal: mockUseGoal } = jest.requireMock("@/hooks/api/goals") as { useGoal: jest.Mock };
    mockUseGoal.mockReturnValue({
      data: { id: 1, title: "Test", status: "not_started", level: "company", progress: 0, description: null, owner: null, dueDate: null, startDate: null, project: null, keyResults: [], links: [], updates: [] },
      isLoading: false, isError: false, error: undefined,
    });
    mockUseGoalsPage.mockReturnValue({
      data: {
        items: [{ id: 1, title: "Test Goal", status: "not_started", level: "company", progress: 0, keyResultCount: 0, owner: null, dueDate: null }],
        page: 1, pageSize: 24, total: 1, totalPages: 1,
      },
      isLoading: false, isError: false, error: undefined, refetch: jest.fn(),
    });

    render(<GoalsPage />);
    fireEvent.keyDown(document, { key: "j" });
    fireEvent.keyDown(document, { key: "e" });

    expect(screen.getByTestId("goal-form-sheet")).toBeInTheDocument();
  });
});
