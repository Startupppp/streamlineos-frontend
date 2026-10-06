import { render, screen } from "@testing-library/react";
import { RoadmapTab } from "./roadmap-tab";
import { useRoadmapItems } from "@/hooks/api/build/roadmap";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItems: jest.fn(),
  useDeleteRoadmapItem: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  ROADMAP_SORTS: ["updated_at", "created_at", "title"],
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
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
    if (resolution.kind === "loading")
      return <div data-testid="page-state-loading">{loading}</div>;
    if (resolution.kind === "denied")
      return (
        <div
          data-testid="no-permission"
          data-permission={resolution.permission ?? ""}
        />
      );
    if (resolution.kind === "error")
      return <div data-testid="error-state" />;
    if (resolution.kind === "empty")
      return <div data-testid="empty-state">{empty}</div>;
    return <div data-testid="page-state-ready">{children}</div>;
  },
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string; action?: unknown; illustration?: React.ReactNode; className?: string }) => (
    <div data-testid="empty-state-content" data-title={title} />
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state-content" />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyProjectsIllustration: () => null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
  PM_PANEL: "",
}));

jest.mock("./roadmap-constants", () => ({
  ROADMAP_COLUMNS: [
    { status: "planned", label: "Planned" },
    { status: "in_progress", label: "In Progress" },
    { status: "completed", label: "Completed" },
    { status: "cancelled", label: "Cancelled" },
  ],
}));

jest.mock("./roadmap-item-card", () => ({
  RoadmapItemCard: () => <div data-testid="roadmap-item-card" />,
}));

jest.mock("./roadmap-item-sheet", () => ({
  RoadmapItemSheet: () => null,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockUseRoadmapItems = useRoadmapItems as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;

const BASE_QUERY = {
  data: {
    data: [],
    pagination: { hasMore: false, nextCursor: null, limit: 20 },
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

const ONE_ROW_QUERY = {
  data: {
    data: [
      {
        id: 1,
        status: "planned",
        title: "Ship it",
        description: null,
        category: null,
        isPublic: true,
        projectId: null,
        epicTicketId: null,
        targetQuarter: null,
        sortOrder: 0,
        votes: 0,
        reach: null,
        impact: null,
        confidence: null,
        effort: null,
        createdBy: null,
        orgId: "org-1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ],
    pagination: { hasMore: false, nextCursor: null, limit: 20 },
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseRoadmapItems.mockReturnValue(BASE_QUERY);
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseOnlineStatus.mockReturnValue(true);
});

describe("RoadmapTab — denial-is-not-emptiness", () => {
  it("renders NoPermissionState when denied — positive control: no-permission node is present", () => {
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "build:roadmap:view",
    });
    render(<RoadmapTab search="" />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it("renders NoPermissionState when denied — negative: EmptyState is NOT present", () => {
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "build:roadmap:view",
    });
    render(<RoadmapTab search="" />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("renders the board columns when there is data — positive control proves component renders", () => {
    mockUseRoadmapItems.mockReturnValue(ONE_ROW_QUERY);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<RoadmapTab search="" />);
    expect(screen.getByTestId("page-state-ready")).toBeInTheDocument();
  });

  it("renders the skeleton when loading — positive control: loading wrapper present", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<RoadmapTab search="" />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
  });

  it("renders the skeleton when loading — negative: ready content absent", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<RoadmapTab search="" />);
    expect(screen.queryByTestId("page-state-ready")).not.toBeInTheDocument();
  });

  it("passes build:roadmap:view as the permission to usePageState so 402 is classified as denied", () => {
    render(<RoadmapTab search="" />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:roadmap:view" }),
    );
  });

  it("shows the empty state when empty — positive control: empty wrapper present", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<RoadmapTab search="" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });
});

describe("RoadmapTab — the empty state tells a first run apart from a filtered no-result", () => {
  it("offers first-run copy when no filter is applied and the org has no roadmap items", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<RoadmapTab search="" />);
    expect(screen.getByTestId("empty-state-content")).toHaveAttribute(
      "data-title",
      "No roadmap items yet",
    );
  });

  it("says the filters excluded everything when a search term returned no rows", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<RoadmapTab search="retention" />);
    expect(screen.getByTestId("empty-state-content")).toHaveAttribute(
      "data-title",
      "No roadmap items match your filters",
    );
  });

  it("says the filters excluded everything when a status filter returned no rows", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<RoadmapTab search="" status="completed" />);
    expect(screen.getByTestId("empty-state-content")).toHaveAttribute(
      "data-title",
      "No roadmap items match your filters",
    );
  });
});

describe("RoadmapTab — the list read carries only keys roadmapListQuerySchema declares", () => {
  it("passes status, managedProductId and sort through to the query", () => {
    render(
      <RoadmapTab
        search="billing"
        status="planned"
        managedProductId={9}
        sort="created_at"
      />,
    );
    expect(mockUseRoadmapItems).toHaveBeenCalledWith({
      search: "billing",
      cursor: undefined,
      status: "planned",
      managedProductId: 9,
      sort: "created_at",
    });
  });

  it("drops a sort value the backend enum rejects, so the read is not a 400", () => {
    render(<RoadmapTab search="" sort="votes" />);
    expect(mockUseRoadmapItems).toHaveBeenCalledWith({ cursor: undefined });
  });

  it("drops a status value the backend enum rejects, so the read is not a 400", () => {
    render(<RoadmapTab search="" status="shipped" />);
    expect(mockUseRoadmapItems).toHaveBeenCalledWith({
      cursor: undefined,
      status: undefined,
    });
  });

  it("passes projectId through to the query so project-scoped items are filtered server-side", () => {
    render(<RoadmapTab search="" projectId={42} />);
    expect(mockUseRoadmapItems).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 42 }),
    );
  });

  it("passes horizon through to the query so a deep-linked horizon reaches the backend", () => {
    render(<RoadmapTab search="" horizon="Q3 2026" />);
    expect(mockUseRoadmapItems).toHaveBeenCalledWith(
      expect.objectContaining({ horizon: "Q3 2026" }),
    );
  });
});

describe("RoadmapTab — offline state", () => {
  it("renders the offline panel when useOnlineStatus returns false and the page is empty — positive: offline node present", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<RoadmapTab search="" />);
    expect(screen.getByText("You're offline")).toBeInTheDocument();
  });

  it("does not render the offline panel when online — negative: offline node absent", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<RoadmapTab search="" />);
    expect(screen.queryByText("You're offline")).not.toBeInTheDocument();
  });
});
