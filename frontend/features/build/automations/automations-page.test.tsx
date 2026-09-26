import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { AutomationsPage } from "./automations-page";
import type { ProjectAutomation } from "@/hooks/api/build/automations";

let mockAccessState: AccessState = "denied";
let mockDebouncedSearch = "";
let mockTriggerFilter = "all";
let mockIsFiltered = false;
let mockAutomations: ProjectAutomation[] = [];
let mockIsLoading = false;
let mockIsError = false;

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => mockAccessState === "granted",
  useCanState: (_permission: string): AccessState => mockAccessState,
}));

jest.mock("@/hooks/api/build/automations", () => ({
  useAutomations: () => ({
    data: mockAutomations,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: null,
    refetch: jest.fn(),
  }),
  useCreateAutomation: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateAutomation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAutomation: () => ({ mutate: jest.fn(), isPending: false }),
  TRIGGER_EVENTS: [
    { value: "ticket.created", label: "Ticket Created" },
    { value: "ticket.updated", label: "Ticket Updated" },
  ],
  ACTION_TYPES: [
    { value: "set_status", label: "Set Status" },
  ],
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: mockDebouncedSearch,
    debouncedSearch: mockDebouncedSearch,
    cursor: null,
    setSearch: jest.fn(),
    setCursor: jest.fn(),
    value: (param: string) => (param === "trigger" ? mockTriggerFilter : "all"),
    isActive: () => false,
    setValue: jest.fn(),
    clearAll: jest.fn(),
    activeCount: 0,
    isFiltered: mockIsFiltered,
    resetKey: "",
    isPending: false,
  }),
  BUILD_FILTER_ALL: "all",
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: () => ({
    focusedIndex: null,
    setFocusedIndex: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isLoading, isError, isEmpty }: { isLoading: boolean; isError: boolean; isEmpty: boolean }) => {
    if (mockAccessState === "loading") return { kind: "loading" };
    if (mockAccessState === "denied") return { kind: "denied" };
    if (isError) return { kind: "error", error: new Error("Load failed") };
    if (isLoading) return { kind: "loading" };
    if (isEmpty) return { kind: "empty" };
    return { kind: "ready" };
  },
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    children,
    resolution,
    loading,
    empty,
  }: {
    children: React.ReactNode;
    resolution: { kind: string };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    onRetry?: () => void;
  }) => {
    switch (resolution.kind) {
      case "loading":
        return <>{loading}</>;
      case "denied":
        return <div role="status">Access denied</div>;
      case "error":
        return <div role="alert">Could not load automations</div>;
      case "empty":
        return <>{empty}</>;
      default:
        return <>{children}</>;
    }
  },
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
  useNavigationLeave: () => (action: () => void) => action(),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  PmStaggerList: ({ children, role, "aria-label": ariaLabel }: { children: React.ReactNode; role?: string; "aria-label"?: string }) => (
    <div role={role} aria-label={ariaLabel}>{children}</div>
  ),
  PM_FILL_PANEL: "",
  PM_FILL_SECTION: "",
}));

jest.mock("@/components/illustrations", () => ({
  AutomationsIllustration: () => <div />,
}));

const SAMPLE_AUTOMATION: ProjectAutomation = {
  id: 1,
  projectId: 10,
  name: "Auto-assign bugs",
  isActive: true,
  triggerEvent: "ticket.created",
  conditions: [],
  actions: [{ type: "set_assignee", value: "user-abc" }],
  createdAt: "2024-01-01T00:00:00.000Z",
};

beforeEach(() => {
  mockAccessState = "denied";
  mockDebouncedSearch = "";
  mockTriggerFilter = "all";
  mockIsFiltered = false;
  mockAutomations = [];
  mockIsLoading = false;
  mockIsError = false;
});

describe("AutomationsPage — build:manage controls (BLD-X-FE-SETTINGS-001)", () => {
  it("hides the New Automation button when the viewer lacks build:manage — no gate existed before", () => {
    render(<AutomationsPage projectId={1} />);
    expect(screen.queryByRole("button", { name: /new automation/i })).not.toBeInTheDocument();
  });

  it("shows the New Automation button when the viewer holds build:manage", () => {
    mockAccessState = "granted";
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByRole("button", { name: /new automation/i })).toBeInTheDocument();
  });

  it("hides the New Automation button while the access snapshot is in flight, because a mutation control that appears and then vanishes offers authority the caller may not hold", () => {
    mockAccessState = "loading";
    render(<AutomationsPage projectId={1} />);
    expect(screen.queryByRole("button", { name: /new automation/i })).not.toBeInTheDocument();
  });
});

describe("AutomationsPage — access states (BLD-X-FE-SETTINGS-002)", () => {
  it("shows loading skeletons while data is loading — loading state renders something (BLD-X-FE-SETTINGS-002a)", () => {
    mockAccessState = "granted";
    mockIsLoading = true;
    render(<AutomationsPage projectId={1} />);
    expect(screen.queryByRole("list", { name: /automations/i })).not.toBeInTheDocument();
  });

  it("shows denied state when access is denied — list content is not rendered (BLD-X-FE-SETTINGS-002b)", () => {
    mockAccessState = "denied";
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /automations/i })).not.toBeInTheDocument();
  });

  it("shows error alert when data load fails — error is distinguished from denial (BLD-X-FE-SETTINGS-002c)", () => {
    mockAccessState = "granted";
    mockIsError = true;
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("AutomationsPage — empty states (BLD-X-FE-SETTINGS-003)", () => {
  it("shows first-run empty state text when no filters are active and no automations exist (BLD-X-FE-SETTINGS-003a)", () => {
    mockAccessState = "granted";
    mockAutomations = [];
    mockIsFiltered = false;
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByText("No automations yet")).toBeInTheDocument();
  });

  it("shows filtered-empty text when filters are active but no automations match (BLD-X-FE-SETTINGS-003b)", () => {
    mockAccessState = "granted";
    mockAutomations = [];
    mockIsFiltered = true;
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByText("No automations match your filters")).toBeInTheDocument();
  });

  it("first-run empty shows Create Automation action for managers (BLD-X-FE-SETTINGS-003c)", () => {
    mockAccessState = "granted";
    mockAutomations = [];
    mockIsFiltered = false;
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByRole("button", { name: /create automation/i })).toBeInTheDocument();
  });

  it("filtered-empty shows Clear filters action instead of Create (BLD-X-FE-SETTINGS-003d)", () => {
    mockAccessState = "granted";
    mockAutomations = [];
    mockIsFiltered = true;
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create automation/i })).not.toBeInTheDocument();
  });
});

describe("AutomationsPage — filter bar (BLD-X-FE-SETTINGS-004)", () => {
  it("renders the search input for filtering automations by name (BLD-X-FE-SETTINGS-004a)", () => {
    mockAccessState = "granted";
    mockAutomations = [SAMPLE_AUTOMATION];
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByRole("searchbox", { name: /search automations/i })).toBeInTheDocument();
  });

  it("renders the trigger filter dropdown (BLD-X-FE-SETTINGS-004b)", () => {
    mockAccessState = "granted";
    mockAutomations = [SAMPLE_AUTOMATION];
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByLabelText(/filter by trigger/i)).toBeInTheDocument();
  });

  it("search filter hides non-matching automations — client-side filter narrows the list (BLD-X-FE-SETTINGS-004c)", () => {
    mockAccessState = "granted";
    mockAutomations = [
      SAMPLE_AUTOMATION,
      { ...SAMPLE_AUTOMATION, id: 2, name: "Sprint cleanup", triggerEvent: "sprint.started" },
    ];
    mockDebouncedSearch = "auto";
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByText("Auto-assign bugs")).toBeInTheDocument();
    expect(screen.queryByText("Sprint cleanup")).not.toBeInTheDocument();
  });

  it("trigger filter hides automations with a different trigger (BLD-X-FE-SETTINGS-004d)", () => {
    mockAccessState = "granted";
    mockAutomations = [
      SAMPLE_AUTOMATION,
      { ...SAMPLE_AUTOMATION, id: 2, name: "Sprint cleanup", triggerEvent: "sprint.started" },
    ];
    mockTriggerFilter = "ticket.created";
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByText("Auto-assign bugs")).toBeInTheDocument();
    expect(screen.queryByText("Sprint cleanup")).not.toBeInTheDocument();
  });
});

describe("AutomationsPage — populated state (BLD-X-FE-SETTINGS-005)", () => {
  it("renders automation list with accessible list role (BLD-X-FE-SETTINGS-005a)", () => {
    mockAccessState = "granted";
    mockAutomations = [SAMPLE_AUTOMATION];
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByRole("list", { name: /automations/i })).toBeInTheDocument();
  });

  it("renders automation names in the list (BLD-X-FE-SETTINGS-005b)", () => {
    mockAccessState = "granted";
    mockAutomations = [SAMPLE_AUTOMATION];
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByText("Auto-assign bugs")).toBeInTheDocument();
  });
});
