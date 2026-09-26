import { render, screen } from "@testing-library/react";
import { TransitionsTable } from "./transitions-table";
import type { CustomState } from "@/hooks/api/build/custom-states";

let mockCanManage = true;
let mockResolution: { kind: string } = { kind: "ready" };
let mockTransitions: unknown[] = [];
let mockIsLoading = false;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanManage,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockResolution,
}));

jest.mock("@/hooks/api/build/workflow", () => ({
  useWorkflowTransitions: () => ({
    data: mockTransitions,
    isLoading: mockIsLoading,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  }),
  useCreateTransition: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateTransition: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteTransition: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    empty: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "denied") return <div data-testid="page-denied" />;
    if (resolution.kind === "error") return <div data-testid="page-error" />;
    if (resolution.kind === "empty") return <div data-testid="page-empty">{empty}</div>;
    return <div data-testid="page-ready">{children}</div>;
  },
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("./transition-form-sheet", () => ({
  TransitionFormSheet: () => null,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockStatuses: CustomState[] = [
  { id: 1, name: "Todo", type: "unstarted", color: null, order: 0, wipLimit: null },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockCanManage = true;
  mockResolution = { kind: "ready" };
  mockTransitions = [];
  mockIsLoading = false;
});

it("renders the Transitions heading regardless of resolution state", () => {
  mockResolution = { kind: "denied" };

  render(<TransitionsTable projectId={1} statuses={mockStatuses} />);

  expect(screen.getByRole("heading", { name: "Transitions" })).toBeInTheDocument();
});

it("renders the data table when resolution is ready and transitions exist", () => {
  mockTransitions = [
    { id: 1, fromStatusId: null, toStatusId: 1, name: "Start", requiresApproval: false, requiredFields: [], allowedRoles: [] },
  ];

  render(<TransitionsTable projectId={1} statuses={mockStatuses} />);

  expect(screen.getByTestId("page-ready")).toBeInTheDocument();
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
});

it("renders the empty state when no transitions are configured", () => {
  mockResolution = { kind: "empty" };

  render(<TransitionsTable projectId={1} statuses={mockStatuses} />);

  expect(screen.getByTestId("page-empty")).toBeInTheDocument();
  expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("renders a skeleton while transitions are loading, not the table", () => {
  mockResolution = { kind: "loading" };
  mockIsLoading = true;

  render(<TransitionsTable projectId={1} statuses={mockStatuses} />);

  expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("renders the denied state instead of transitions when access is denied", () => {
  mockResolution = { kind: "denied" };

  render(<TransitionsTable projectId={1} statuses={mockStatuses} />);

  expect(screen.getByTestId("page-denied")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows the add button to a user with workflow manage permission", () => {
  mockCanManage = true;

  render(<TransitionsTable projectId={1} statuses={mockStatuses} />);

  expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
});

it("does not show the add button to a user without workflow manage permission", () => {
  mockCanManage = false;

  render(<TransitionsTable projectId={1} statuses={mockStatuses} />);

  expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument();
});
