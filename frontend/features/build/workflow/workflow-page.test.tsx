import { render, screen } from "@testing-library/react";
import { WorkflowPage } from "./workflow-page";

let mockResolution: "loading" | "denied" | "error" | "empty" | "ready" = "ready";
let mockStatuses: Array<{ id: number; name: string; type?: string; color?: string | null; order: number; wipLimit?: number | null }> = [];
let mockTransitions: Array<{ id: number; fromStatusId: number | null; toStatusId: number; name?: string; requiresApproval: boolean; requiredFields: string[]; allowedRoles: string[] }> = [];
let mockCanManage = true;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanManage,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: mockResolution }),
}));

jest.mock("@/hooks/api/build/custom-states", () => ({
  useCustomStates: () => ({
    data: mockStatuses,
    isLoading: mockResolution === "loading",
    isError: mockResolution === "error",
    error: mockResolution === "error" ? new Error("Unable to load workflow") : undefined,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/build/workflow", () => ({
  useWorkflowTransitions: () => ({
    data: mockTransitions,
    isLoading: false,
  }),
  useCreateTransition: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateTransition: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteTransition: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateStatusWip: () => ({ mutate: jest.fn(), isPending: false }),
}));

const mockUseBuildListKeyboard = jest.fn();
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) => mockUseBuildListKeyboard(...args),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    clearAll: jest.fn(),
    activeCount: 0,
    isFiltered: false,
    cursor: null,
    setCursor: jest.fn(),
    value: jest.fn(),
    isActive: jest.fn(),
    setValue: jest.fn(),
    resetKey: "",
    isPending: false,
  }),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => <div data-testid="build-list-toolbar" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, children, filters }: { title: string; children: React.ReactNode; filters?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, empty, children }: { resolution: { kind: string }; loading: React.ReactNode; empty: React.ReactNode; children: React.ReactNode }) => {
    if (resolution.kind === "loading") return <div data-testid="workflow-loading">{loading}</div>;
    if (resolution.kind === "denied") return <div data-testid="workflow-denied" />;
    if (resolution.kind === "error") return <div data-testid="workflow-error" />;
    if (resolution.kind === "empty") return <div data-testid="workflow-empty">{empty}</div>;
    return <div data-testid="workflow-ready">{children}</div>;
  },
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({ DataTableSkeleton: () => <div data-testid="skeleton" /> }));
jest.mock("@/components/ui/empty-state", () => ({ EmptyState: ({ title }: { title: string }) => <div>{title}</div> }));
jest.mock("@/features/build/workflow/transitions-table", () => ({
  TRANSITION_TABLE_HEADERS: [],
  TransitionsTable: ({ transitions }: { transitions?: unknown[] }) => (
    <div data-testid="transitions" data-count={transitions?.length ?? 0} />
  ),
}));
jest.mock("@/features/build/workflow/wip-row", () => ({ WipRow: ({ status }: { status: { name: string } }) => <div data-testid="wip-row">{status.name}</div> }));

describe("WorkflowPage access and states", () => {
  beforeEach(() => {
    mockResolution = "ready";
    mockStatuses = [{ id: 1, name: "Todo", type: "unstarted", color: null, order: 0, wipLimit: null }];
    mockTransitions = [];
    mockCanManage = true;
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  });

  it("does not render workflow content while access is denied", () => {
    mockResolution = "denied";

    render(<WorkflowPage projectId={6} />);

    expect(screen.getByTestId("workflow-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("transitions")).not.toBeInTheDocument();
  });

  it("renders the configured workflow when access is ready", () => {
    render(<WorkflowPage projectId={6} />);

    expect(screen.getByTestId("workflow-ready")).toBeInTheDocument();
    expect(screen.getByTestId("transitions")).toBeInTheDocument();
    expect(screen.getByTestId("wip-row")).toBeInTheDocument();
  });

  it("keeps the empty workflow state distinct from denied access", () => {
    mockResolution = "empty";
    mockStatuses = [];

    render(<WorkflowPage projectId={6} />);

    expect(screen.getByTestId("workflow-empty")).toHaveTextContent("No statuses configured");
    expect(screen.queryByTestId("workflow-denied")).not.toBeInTheDocument();
  });

  it("renders the loading state with skeletons", () => {
    mockResolution = "loading";

    render(<WorkflowPage projectId={6} />);

    expect(screen.getByTestId("workflow-loading")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton")).toHaveLength(2);
    expect(screen.queryByTestId("transitions")).not.toBeInTheDocument();
  });

  it("renders the error state without leaking workflow data", () => {
    mockResolution = "error";

    render(<WorkflowPage projectId={6} />);

    expect(screen.getByTestId("workflow-error")).toBeInTheDocument();
    expect(screen.queryByTestId("transitions")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wip-row")).not.toBeInTheDocument();
  });

  it("renders all wip rows when statuses are present", () => {
    mockStatuses = [
      { id: 1, name: "Todo", type: "unstarted", color: null, order: 0 },
      { id: 2, name: "In Progress", type: "started", color: "#00f", order: 1 },
    ];

    render(<WorkflowPage projectId={6} />);

    expect(screen.getAllByTestId("wip-row")).toHaveLength(2);
    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders the search toolbar", () => {
    render(<WorkflowPage projectId={6} />);

    expect(screen.getByTestId("build-list-toolbar")).toBeInTheDocument();
  });
});

describe("WorkflowPage permissions (C3)", () => {
  beforeEach(() => {
    mockResolution = "ready";
    mockStatuses = [{ id: 1, name: "Todo", type: "unstarted", color: null, order: 0 }];
    mockTransitions = [];
    mockCanManage = false;
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  });

  it("does not pass onCreate to keyboard hook when user cannot manage workflow", () => {
    render(<WorkflowPage projectId={6} />);

    const lastCall = mockUseBuildListKeyboard.mock.calls.at(-1) as [{ onCreate?: () => void }];
    expect(lastCall?.[0]?.onCreate).toBeUndefined();
  });
});

describe("WorkflowPage keyboard shortcuts (C3)", () => {
  beforeEach(() => {
    mockResolution = "ready";
    mockStatuses = [{ id: 1, name: "Todo", type: "unstarted", color: null, order: 0 }];
    mockTransitions = [
      { id: 1, fromStatusId: null, toStatusId: 1, name: "Start", requiresApproval: false, requiredFields: [], allowedRoles: [] },
    ];
    mockCanManage = true;
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  });

  it("passes onCreate to the keyboard hook when canManage is true", () => {
    render(<WorkflowPage projectId={6} />);

    const lastCall = mockUseBuildListKeyboard.mock.calls.at(-1) as [{ onCreate?: () => void }];
    expect(lastCall?.[0]?.onCreate).toBeDefined();
  });

  it("passes onOpen and onEdit to the keyboard hook for transition navigation", () => {
    render(<WorkflowPage projectId={6} />);

    const lastCall = mockUseBuildListKeyboard.mock.calls.at(-1) as [{ onOpen?: (i: number) => void; onEdit?: (i: number) => void }];
    expect(lastCall?.[0]?.onOpen).toBeDefined();
    expect(lastCall?.[0]?.onEdit).toBeDefined();
  });

  it("passes searchInputRef to the keyboard hook for the / shortcut", () => {
    render(<WorkflowPage projectId={6} />);

    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ searchInputRef: expect.anything() }),
    );
  });

  it("passes the correct itemCount matching the transitions list", () => {
    render(<WorkflowPage projectId={6} />);

    const lastCall = mockUseBuildListKeyboard.mock.calls.at(-1) as [{ itemCount: number }];
    expect(lastCall?.[0]?.itemCount).toBe(1);
  });
});
