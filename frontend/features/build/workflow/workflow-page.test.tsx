import { render, screen } from "@testing-library/react";
import { WorkflowPage } from "./workflow-page";

let mockResolution: "loading" | "denied" | "error" | "empty" | "ready" = "ready";
let mockStatuses: Array<{ id: number; name: string }> = [];

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
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

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
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
  TransitionsTable: () => <div data-testid="transitions" />,
}));
jest.mock("@/features/build/workflow/wip-row", () => ({ WipRow: () => <div data-testid="wip-row" /> }));

describe("WorkflowPage access and states", () => {
  beforeEach(() => {
    mockResolution = "ready";
    mockStatuses = [{ id: 1, name: "Todo" }];
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
});
