import { render, screen } from "@testing-library/react";
import { ProjectFeedbucketPage } from "./project-feedbucket-page";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/1/feedbucket",
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "pm-fill-panel",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    state,
  }: {
    children?: React.ReactNode;
    state?: { kind: string };
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    loading?: React.ReactNode;
    onRetry?: () => void;
  }) => {
    if (state?.kind === "denied" || state?.kind === "module-disabled" || state?.kind === "module-denied")
      return <div role="status" data-testid="no-permission-state">Access Restricted</div>;
    if (state?.kind === "loading")
      return <div data-testid="page-loading" />;
    return <div>{children}</div>;
  },
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {action ? <button type="button" onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@animateicons/react/lucide", () => ({
  SettingsIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/illustrations", () => ({
  EmptyTicketIllustration: () => null,
}));

jest.mock("./project-submissions-inbox", () => ({
  ProjectSubmissionsInbox: ({ widgetId, projectId }: { widgetId: number; projectId: number }) => (
    <div data-testid="submissions-inbox" data-widget={widgetId} data-project={projectId} />
  ),
}));

jest.mock("./create-feedbucket-widget-sheet", () => ({
  CreateFeedbucketWidgetSheet: () => null,
}));

jest.mock("./widget-setup-sheet", () => ({
  WidgetSetupSheet: () => null,
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

const mockUseFeedbucketWidgets = jest.fn();
jest.mock("@/hooks/api/feedbucket", () => ({
  useFeedbucketWidgets: () => mockUseFeedbucketWidgets(),
}));

const mockUseProject = jest.fn();
jest.mock("@/hooks/api/build/projects", () => ({
  useProject: (id: number) => mockUseProject(id),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProject.mockReturnValue({ data: { name: "My Project" } });
  mockUseFeedbucketWidgets.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUsePageState.mockReturnValue({ kind: "ready" });
});

describe("ProjectFeedbucketPage — permission gating via usePageState, not bare useCan", () => {
  it("renders Access Restricted when usePageState resolves to denied so the user gets a meaningful message rather than an empty screen", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "feedbucket:submissions:view" });

    render(<ProjectFeedbucketPage projectId={1} />);

    expect(screen.getByTestId("no-permission-state")).toBeInTheDocument();
    expect(screen.queryByTestId("submissions-inbox")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("renders Access Restricted for module-disabled so an org without the feedbucket module sees the correct state", () => {
    mockUsePageState.mockReturnValue({ kind: "module-disabled", moduleKey: "feedbucket" });

    render(<ProjectFeedbucketPage projectId={1} />);

    expect(screen.getByTestId("no-permission-state")).toBeInTheDocument();
  });

  it("does not show Access Restricted while the access snapshot is loading, because useCan returns false during that window", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<ProjectFeedbucketPage projectId={1} />);

    expect(screen.queryByTestId("no-permission-state")).not.toBeInTheDocument();
  });

  it("passes feedbucket:submissions:view permission to usePageState so the correct gate is evaluated", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<ProjectFeedbucketPage projectId={1} />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "feedbucket:submissions:view" }),
    );
  });

  it("passes the feedbucket module key to usePageState so the module-disabled state is reachable", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<ProjectFeedbucketPage projectId={1} />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ module: "feedbucket" }),
    );
  });
});

describe("ProjectFeedbucketPage — ready and empty states", () => {
  it("renders the empty state when there is no widget for this project", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });

    render(<ProjectFeedbucketPage projectId={1} />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no feedback widget/i)).toBeInTheDocument();
  });

  it("renders the submissions inbox when a widget exists for this project", () => {
    const widget = { id: 42, projectId: 1, isActive: true, aiAssistEnabled: false };
    mockUseFeedbucketWidgets.mockReturnValue({
      data: [widget],
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<ProjectFeedbucketPage projectId={1} />);

    expect(screen.getByTestId("submissions-inbox")).toBeInTheDocument();
    expect(screen.getByTestId("submissions-inbox")).toHaveAttribute("data-widget", "42");
  });

  it("passes isError and error to usePageState so a 402 or 403 is not silently presented as an empty inbox", () => {
    const err = new Error("access denied");
    mockUseFeedbucketWidgets.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: jest.fn(),
    });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<ProjectFeedbucketPage projectId={1} />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true, error: err }),
    );
  });
});
