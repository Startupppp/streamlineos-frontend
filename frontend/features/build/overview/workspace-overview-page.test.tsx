import { render, screen } from "@testing-library/react";
import { WorkspaceOverviewPage } from "./workspace-overview-page";

const usePageState = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/workspaces/ws-1",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => usePageState(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
}));

jest.mock("@/hooks/api/build/pm-workspaces", () => ({
  usePmWorkspace: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
  usePmWorkspaceMembers: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/build/all-work", () => ({
  useAllWork: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/features/build/project-create/project-create-wizard", () => ({
  ProjectCreateWizard: () => <div data-testid="project-create-wizard" />,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => <svg data-testid="plus-icon" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("WorkspaceOverviewPage", () => {
  it("renders access-restricted state when permission is denied so denial is never silently empty", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:workspaces:view" });

    render(<WorkspaceOverviewPage pmWorkspaceId="ws-1" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders member count and my open work stat cards in the populated state", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { usePmWorkspace } = jest.requireMock("@/hooks/api/build/pm-workspaces");
    (usePmWorkspace as jest.Mock).mockReturnValue({
      data: { id: "ws-1", name: "Design Team", status: "active" },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { usePmWorkspaceMembers } = jest.requireMock("@/hooks/api/build/pm-workspaces");
    (usePmWorkspaceMembers as jest.Mock).mockReturnValue({
      data: {
        data: [{ id: "u1", name: "Alice" }],
        pagination: { hasMore: false },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<WorkspaceOverviewPage pmWorkspaceId="ws-1" />);

    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("My open work")).toBeInTheDocument();
  });

  it("renders a plus-suffixed member count when the member page has more results", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { usePmWorkspaceMembers } = jest.requireMock("@/hooks/api/build/pm-workspaces");
    (usePmWorkspaceMembers as jest.Mock).mockReturnValue({
      data: {
        data: Array(5).fill({ id: "u", name: "User" }),
        pagination: { hasMore: true },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<WorkspaceOverviewPage pmWorkspaceId="ws-1" />);

    expect(screen.getByText("5+")).toBeInTheDocument();
  });

  it("does not render the create wizard when the user lacks build:create permission", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useCan } = jest.requireMock("@/hooks/api/access");
    useCan.mockReturnValue(false);

    render(<WorkspaceOverviewPage pmWorkspaceId="ws-1" />);

    expect(screen.queryByTestId("project-create-wizard")).not.toBeInTheDocument();
  });

  it("renders the error state when the resolution reports an error", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("Failed to load") });

    render(<WorkspaceOverviewPage pmWorkspaceId="ws-1" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
