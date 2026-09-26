import { fireEvent, render, screen } from "@testing-library/react";
import { PortfoliosPage } from "./portfolios-page";
import { PortfolioDetailPage } from "./portfolio-detail-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/portfolios",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/build", () => ({
  usePortfolios: jest.fn(),
  usePortfolio: jest.fn(),
  useProjects: jest.fn(() => ({ data: undefined })),
  useCreatePortfolio: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdatePortfolio: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeletePortfolio: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useLinkPortfolioProject: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUnlinkPortfolioProject: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, empty, children }: {
    resolution: { kind: string; permission?: string | null };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "module-denied" ||
      resolution.kind === "plan-required"
    )
      return (
        <div
          data-testid="denied-state"
          data-permission={resolution.kind === "denied" ? resolution.permission : undefined}
        />
      );
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <>{empty ?? children}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters, actions }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>{actions}{filters}{children}</div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
  PM_PANEL: "",
  PM_ROW: "",
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => null,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectValue: () => null,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
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

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
  XIcon: () => null,
}));

jest.mock("./portfolio-status-badge", () => ({
  PortfolioStatusBadge: () => null,
  PortfolioHealthBadge: () => null,
}));

jest.mock("./portfolio-form-sheet", () => ({
  PortfolioFormSheet: ({ open }: { open?: boolean }) =>
    open ? <div data-testid="portfolio-form-sheet" /> : null,
}));

const { usePortfolios, usePortfolio, useProjects } = jest.requireMock("@/hooks/api/build") as {
  usePortfolios: jest.Mock;
  usePortfolio: jest.Mock;
  useProjects: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};
const { useCan: mockPortfoliosUseCan } = jest.requireMock("@/hooks/api/access") as {
  useCan: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockReturnValue({ kind: "ready" });
  mockPortfoliosUseCan.mockReturnValue(true);
});

describe("PortfoliosPage — denied state (BSN-FE-D1)", () => {
  it("shows denied state when usePageState returns denied, not empty state", () => {
    usePortfolios.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "denied", permission: "build:portfolios:view" });

    render(<PortfoliosPage />);

    expect(screen.getByTestId("denied-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes the portfolios permission key to denied state", () => {
    usePortfolios.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "denied", permission: "build:portfolios:view" });

    render(<PortfoliosPage />);

    expect(screen.getByTestId("denied-state")).toHaveAttribute(
      "data-permission",
      "build:portfolios:view",
    );
  });

  it("shows data table when usePageState returns ready with data", () => {
    usePortfolios.mockReturnValue({
      data: {
        data: [{ id: 1, name: "Test Portfolio", status: "active", health: "on_track", ownerId: null, projectCount: 0, strategicGoal: null }],
        pagination: { nextCursor: null, hasMore: false },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<PortfoliosPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.queryByTestId("denied-state")).not.toBeInTheDocument();
  });
});

describe("PortfoliosPage — permission gates (BSN-FE-D5)", () => {
  it("hides New portfolio button when build:portfolios:manage is denied because a create control must not offer authority the caller may not hold", () => {
    mockPortfoliosUseCan.mockReturnValue(false);
    usePortfolios.mockReturnValue({
      data: { data: [], pagination: { nextCursor: null, hasMore: false } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<PortfoliosPage />);

    expect(screen.queryByText("New portfolio")).not.toBeInTheDocument();
  });

  it("shows New portfolio button when build:portfolios:manage is granted", () => {
    usePortfolios.mockReturnValue({
      data: { data: [], pagination: { nextCursor: null, hasMore: false } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<PortfoliosPage />);

    expect(screen.getAllByText("New portfolio")[0]).toBeInTheDocument();
  });
});

describe("PortfoliosPage — keyboard shortcuts (BSN-FE-K2)", () => {
  it("c shortcut opens the create form sheet", () => {
    usePortfolios.mockReturnValue({
      data: { data: [], pagination: { nextCursor: null, hasMore: false } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<PortfoliosPage />);
    fireEvent.keyDown(document, { key: "c" });

    expect(screen.getByTestId("portfolio-form-sheet")).toBeInTheDocument();
  });

  it("e shortcut opens the edit form sheet for the focused row", () => {
    usePortfolios.mockReturnValue({
      data: {
        data: [
          { id: 1, name: "Test Portfolio", status: "active", health: "on_track", ownerId: null, projectCount: 0, strategicGoal: null },
        ],
        pagination: { nextCursor: null, hasMore: false },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<PortfoliosPage />);
    fireEvent.keyDown(document, { key: "j" });
    fireEvent.keyDown(document, { key: "e" });

    expect(screen.getByTestId("portfolio-form-sheet")).toBeInTheDocument();
  });
});

describe("PortfolioDetailPage — denied state (BSN-FE-D4)", () => {
  it("shows denied state when usePageState returns denied, not error state", () => {
    usePortfolio.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "denied", permission: "build:portfolios:view" });

    render(<PortfolioDetailPage portfolioId={1} />);

    expect(screen.getByTestId("denied-state")).toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  });

  it("shows loading skeleton when isLoading is true", () => {
    usePortfolio.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "loading" });

    render(<PortfolioDetailPage portfolioId={1} />);

    expect(screen.queryByTestId("denied-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  });

  it("appends and deduplicates linked projects while rendering linked programs", () => {
    useProjects.mockReturnValue({
      data: {
        data: [
          { id: 1, name: "Project One" },
          { id: 2, name: "Project Two" },
          { id: 3, name: "Project Three" },
        ],
      },
    });
    usePortfolio.mockImplementation(
      (_portfolioId: number, filters?: { projectsCursor?: string }) => ({
        data: {
          id: 1,
          name: "Portfolio One",
          status: "active",
          health: "on_track",
          ownerId: null,
          strategicGoal: null,
          description: null,
          projects:
            filters?.projectsCursor === "next-projects"
              ? {
                  data: [
                    { id: 1, name: "Project One", key: "ONE", status: "ACTIVE" },
                    { id: 2, name: "Project Two", key: "TWO", status: "ACTIVE" },
                  ],
                  pagination: { nextCursor: null, hasMore: false },
                }
              : {
                  data: [{ id: 1, name: "Project One", key: "ONE", status: "ACTIVE" }],
                  pagination: { nextCursor: "next-projects", hasMore: true },
                },
          programs: {
            data: [{ id: 10, name: "Program Alpha", status: "active" }],
            pagination: { nextCursor: null, hasMore: false },
          },
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      }),
    );

    render(<PortfolioDetailPage portfolioId={1} />);

    expect(screen.getByText("Project One")).toBeInTheDocument();
    expect(screen.getByText("Program Alpha")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Next page" })[0]);
    expect(screen.getByText("Project Two")).toBeInTheDocument();
    expect(screen.getAllByText("Project One")).toHaveLength(1);
    expect(screen.queryByTestId("select-item-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("select-item-2")).not.toBeInTheDocument();
    expect(screen.getByTestId("select-item-3")).toBeInTheDocument();
  });
});
