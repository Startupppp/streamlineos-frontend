import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductGoalsPage } from "./product-goals-page";

const mockSetCreateOpen = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/goals",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string; permission?: string | null };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-state-loading">{loading}</div>;
    if (resolution.kind === "denied")
      return (
        <div
          data-testid="no-permission"
          data-permission={resolution.permission ?? ""}
        />
      );
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <div data-testid="empty-state">{empty}</div>;
    return <div data-testid="page-state-ready">{children}</div>;
  },
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoalsPage: jest.fn(),
  useGoalStats: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({
    open: false,
    onOpenChange: jest.fn(),
    setOpen: mockSetCreateOpen,
  }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    filters,
    actions,
  }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {actions}
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
  PM_PANEL: "",
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => null,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyTargetIllustration: () => null,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: () => <div data-testid="table-pagination" />,
}));

jest.mock("@/features/build/goals/goal-form-sheet", () => ({
  GoalFormSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="goal-form-sheet" /> : null,
}));

jest.mock("@/features/build/goals/goals-list-shared", () => ({
  GoalCard: ({ goal }: { goal: { title: string } }) => (
    <div data-testid="goal-card">{goal.title}</div>
  ),
  GoalsListToolbar: () => <div data-testid="goals-list-toolbar" />,
  GOAL_FILTER_DEFINITIONS: [
    { param: "level", options: ["company", "team", "individual"] },
    { param: "status", options: ["not_started", "on_track", "at_risk", "off_track", "completed"] },
    { param: "ownerId" },
    { param: "health" },
    { param: "due" },
    { param: "scope" },
  ],
  GOAL_LEVEL_ORDER: ["company", "team", "individual"],
}));

jest.mock("@/features/build/goals/constants", () => ({
  STATUS_OPTIONS: [],
  LEVEL_OPTIONS: [],
  LEVEL_LABEL: { company: "Company", team: "Team", individual: "Individual" },
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const { useGoalsPage } = jest.requireMock("@/hooks/api/goals") as {
  useGoalsPage: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

const EMPTY_RESULT = {
  data: { items: [], page: 1, pageSize: 20, total: 0 },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockReturnValue({ kind: "ready" });
  useGoalsPage.mockReturnValue(EMPTY_RESULT);
});

describe("ProductGoalsPage — c shortcut (C3 BSN-KB-GOALS-01)", () => {
  it("c key calls the create handler to initiate creating a goal on the product goals page", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    fireEvent.keyDown(document, { key: "c" });
    expect(mockSetCreateOpen).toHaveBeenCalledTimes(1);
  });
});

describe("ProductGoalsPage — states (C3 BSN-STATE-GOALS-01)", () => {
  it("loading state renders the skeleton so layout does not shift on load", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("error state is rendered so a backend failure surfaces to the user", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("server error") });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("denied state does not look like empty-goals so screen-reader users are not misled", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("ready state renders goal cards when data is present", () => {
    useGoalsPage.mockReturnValue({
      data: {
        items: [
          { id: 1, title: "Grow revenue 20%", level: "company", status: "on_track", progress: 40, keyResultCount: 2, owner: null },
        ],
        page: 1, pageSize: 20, total: 1,
      },
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("goal-card")).toBeInTheDocument();
    expect(screen.getByText("Grow revenue 20%")).toBeInTheDocument();
  });
});

describe("ProductGoalsPage — URL params forwarded to hook (C3 BSN-FILTER-GOALS-01)", () => {
  it("passes managedProductId to useGoalsPage so goals are scoped to this product", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    expect(useGoalsPage).toHaveBeenCalledWith(
      expect.objectContaining({ managedProductId: 7 }),
    );
  });

  it("passes page and limit to useGoalsPage for bounded server-side pagination (C4)", () => {
    render(<ProductGoalsPage managedProductId={7} />);
    expect(useGoalsPage).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });
});
