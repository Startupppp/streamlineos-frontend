import React from "react";
import { render, screen } from "@testing-library/react";
import { GoalsPage } from "./goals-page";

jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(),
  useGoalStats: jest.fn(),
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

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({
    open: false,
    onOpenChange: jest.fn(),
    setOpen: jest.fn(),
  }),
}));

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
  GoalFormSheet: () => null,
}));

jest.mock("@/features/build/goals/goal-filters-popover", () => ({
  GoalFiltersPopover: () => null,
  GoalLevelStatusFilters: () => null,
}));

jest.mock("@/features/build/goals/constants", () => ({
  STATUS_CONFIG: {},
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

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => <input data-testid="search-input" />,
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
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

import { useGoals, useGoalStats } from "@/hooks/api/goals";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseGoals = useGoals as jest.Mock;
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
  mockUseGoalStats.mockReturnValue({ data: undefined });
});

it("shows skeleton not empty state while access snapshot is still in flight because useGatedQuery disables the query until snapshot lands", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseGoals.mockReturnValue(disabledQueryResult());

  render(<GoalsPage />);

  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("shows NoPermissionState not empty state when build:goals:view is denied", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseGoals.mockReturnValue(disabledQueryResult());

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

  expect(screen.getByText("New Goal")).toBeInTheDocument();
});
