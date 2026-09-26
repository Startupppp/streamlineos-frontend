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
  useGoal: jest.fn(() => ({ data: undefined })),
  useDeleteGoal: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
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
  GoalCard: ({
    goal,
    onEdit,
    onDelete,
  }: {
    goal: { id: number; title: string };
    onEdit?: (goal: { id: number; title: string }) => void;
    onDelete?: (goal: { id: number; title: string }) => void;
  }) => (
    <div
      data-testid="goal-card"
      data-has-edit={onEdit ? "true" : "false"}
      data-has-delete={onDelete ? "true" : "false"}
    >
      {goal.title}
      {onEdit ? (
        <button type="button" data-testid="goal-card-edit" onClick={() => onEdit(goal)}>
          Edit
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" data-testid="goal-card-delete" onClick={() => onDelete(goal)}>
          Delete
        </button>
      ) : null}
    </div>
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

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    destructive?: boolean;
    isPending?: boolean;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button type="button" data-testid="confirm-dialog-confirm" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    ) : null,
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "An error occurred"),
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

const { useGoalsPage, useDeleteGoal, useGoal } = jest.requireMock("@/hooks/api/goals") as {
  useGoalsPage: jest.Mock;
  useDeleteGoal: jest.Mock;
  useGoal: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};
const { useCan } = jest.requireMock("@/hooks/api/access") as {
  useCan: jest.Mock;
};

const EMPTY_RESULT = {
  data: { items: [], page: 1, pageSize: 20, total: 0 },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

const GOAL_WITH_ACTIONS = {
  id: 1,
  title: "Grow revenue 20%",
  level: "company",
  status: "on_track",
  progress: 40,
  keyResultCount: 2,
  owner: null,
};

const RESULT_WITH_ONE_GOAL = {
  data: {
    items: [GOAL_WITH_ACTIONS],
    page: 1,
    pageSize: 20,
    total: 1,
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
  usePageState.mockReturnValue({ kind: "ready" });
  useGoalsPage.mockReturnValue(EMPTY_RESULT);
  useDeleteGoal.mockReturnValue({ mutate: jest.fn(), isPending: false });
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

describe("ProductGoalsPage — edit action (C3 BSN-ACTIONS-GOALS-EDIT)", () => {
  it("passes onEdit to GoalCard when canManage is true so the edit action is reachable", () => {
    useCan.mockReturnValue(true);
    useGoalsPage.mockReturnValue(RESULT_WITH_ONE_GOAL);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("goal-card")).toHaveAttribute("data-has-edit", "true");
  });

  it("does not pass onEdit to GoalCard when canManage is false so the action is hidden for non-managers", () => {
    useCan.mockReturnValue(false);
    useGoalsPage.mockReturnValue(RESULT_WITH_ONE_GOAL);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("goal-card")).toHaveAttribute("data-has-edit", "false");
  });
});

describe("ProductGoalsPage — delete action and confirm overlay (C3 BSN-ACTIONS-GOALS-DELETE)", () => {
  it("passes onDelete to GoalCard when canManage is true so the delete action is reachable", () => {
    useCan.mockReturnValue(true);
    useGoalsPage.mockReturnValue(RESULT_WITH_ONE_GOAL);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("goal-card")).toHaveAttribute("data-has-delete", "true");
  });

  it("does not pass onDelete to GoalCard when canManage is false so the action is hidden for non-managers", () => {
    useCan.mockReturnValue(false);
    useGoalsPage.mockReturnValue(RESULT_WITH_ONE_GOAL);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("goal-card")).toHaveAttribute("data-has-delete", "false");
  });

  it("clicking delete on a goal card opens the confirm dialog so destructive intent is confirmed", () => {
    useCan.mockReturnValue(true);
    useGoalsPage.mockReturnValue(RESULT_WITH_ONE_GOAL);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("goal-card-delete"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("confirming the delete dialog calls useDeleteGoal.mutate with the correct goal id", () => {
    const mockMutate = jest.fn();
    useDeleteGoal.mockReturnValue({ mutate: mockMutate, isPending: false });
    useCan.mockReturnValue(true);
    useGoalsPage.mockReturnValue(RESULT_WITH_ONE_GOAL);
    render(<ProductGoalsPage managedProductId={7} />);
    fireEvent.click(screen.getByTestId("goal-card-delete"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(mockMutate).toHaveBeenCalledWith(
      GOAL_WITH_ACTIONS.id,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});

describe("ProductGoalsPage — keyboard shortcuts e and Esc (C3 BSN-KB-GOALS-02)", () => {
  it("e key with a focused goal opens the edit sheet for that goal", () => {
    const goalDetail = {
      id: 1,
      title: "Grow revenue 20%",
      description: null,
      level: "company",
      status: "on_track",
      progress: 40,
      startDate: null,
      dueDate: null,
      owner: null,
      keyResults: [],
      links: [],
      version: 1,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };
    useGoal.mockReturnValue({ data: goalDetail });
    useCan.mockReturnValue(true);
    useGoalsPage.mockReturnValue(RESULT_WITH_ONE_GOAL);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.queryByTestId("goal-form-sheet")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "j" });
    fireEvent.keyDown(document, { key: "e" });
    expect(screen.getByTestId("goal-form-sheet")).toBeInTheDocument();
  });

  it("e key does nothing when canManage is false so read-only users cannot trigger the edit sheet", () => {
    useCan.mockReturnValue(false);
    useGoalsPage.mockReturnValue(RESULT_WITH_ONE_GOAL);
    render(<ProductGoalsPage managedProductId={7} />);
    fireEvent.keyDown(document, { key: "j" });
    fireEvent.keyDown(document, { key: "e" });
    expect(screen.queryByTestId("goal-form-sheet")).not.toBeInTheDocument();
  });
});
