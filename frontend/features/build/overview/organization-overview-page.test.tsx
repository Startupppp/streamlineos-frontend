import { render, screen } from "@testing-library/react";
import { OrganizationOverviewPage } from "./organization-overview-page";

const usePageState = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => usePageState(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
}));

jest.mock("@/hooks/api/build/pm-workspaces", () => ({
  usePmWorkspaces: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
}));

jest.mock("@/hooks/api/build/all-work", () => ({
  useAllWork: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
}));

jest.mock("@/hooks/api/build/portfolios", () => ({
  usePortfolios: jest.fn(() => ({ data: undefined, isLoading: false, isError: false })),
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

describe("OrganizationOverviewPage", () => {
  it("renders access-restricted state when permission is denied so denial is never silently empty", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:view" });

    render(<OrganizationOverviewPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders workspace and project stat cards in the populated state", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useCan } = jest.requireMock("@/hooks/api/access");
    useCan.mockReturnValue(false);

    const { usePmWorkspaces } = jest.requireMock("@/hooks/api/build/pm-workspaces");
    (usePmWorkspaces as jest.Mock).mockReturnValue({
      data: { data: [{ id: "ws1", name: "Workspace 1" }], pagination: { hasMore: false } },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    (useProjects as jest.Mock).mockReturnValue({
      data: { data: [{ id: 1, name: "Project 1", key: "P1", status: "ACTIVE" }], hasMore: false },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<OrganizationOverviewPage />);

    expect(screen.getByText("Active workspaces")).toBeInTheDocument();
    expect(screen.getByText("Active projects")).toBeInTheDocument();
  });

  it("renders the cursor-honest plus-suffixed count when the workspace page has more results", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { usePmWorkspaces } = jest.requireMock("@/hooks/api/build/pm-workspaces");
    (usePmWorkspaces as jest.Mock).mockReturnValue({
      data: { data: Array(10).fill({ id: "ws", name: "W" }), pagination: { hasMore: true } },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<OrganizationOverviewPage />);

    expect(screen.getByText("10+")).toBeInTheDocument();
  });

  it("does not render the create wizard button when the user lacks build:create permission", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useCan } = jest.requireMock("@/hooks/api/access");
    useCan.mockReturnValue(false);

    render(<OrganizationOverviewPage />);

    expect(screen.queryByTestId("project-create-wizard")).not.toBeInTheDocument();
  });

  it("renders the error state when the resolution reports an error", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("Network error") });

    render(<OrganizationOverviewPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
