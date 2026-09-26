"use client";

import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === "token" ? "invite-abc" : null),
  }),
  usePathname: () => "/client-portal",
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("@/features/portal/components/portal-header", () => ({
  PortalHeader: () => <header data-testid="portal-header" />,
}));

jest.mock("@/features/portal/components/portal-project-card", () => ({
  PortalProjectCard: ({ project }: { project: { id: number; name: string } }) => (
    <div data-testid={`project-card-${project.id}`}>{project.name}</div>
  ),
}));

jest.mock("@/features/portal/components/portal-project-detail", () =>
  jest.requireActual(
    "@/features/portal/components/portal-project-detail",
  ),
);

jest.mock("@/hooks/api/portal/use-portal-guard", () => ({
  usePortalGuard: jest.fn(),
}));

jest.mock("@/hooks/api/portal/use-portal-projects", () => ({
  useExternalPortalProjects: jest.fn(),
}));

jest.mock("@/hooks/api/portal/use-portal-project-overview", () => ({
  usePortalProjectOverview: jest.fn(),
}));

jest.mock("@/hooks/api/portal/use-accept-invitation", () => ({
  useAcceptInvitation: jest.fn(),
}));

jest.mock("@/hooks/api/portal/use-submit-change-request", () => ({
  useSubmitChangeRequest: jest.fn().mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
  }),
}));

jest.mock("@/lib/portal-api-client", () => ({
  setPortalToken: jest.fn(),
  getPortalToken: jest.fn().mockReturnValue(null),
  clearPortalToken: jest.fn(),
}));

jest.mock("@/lib/branding", () => ({
  BRAND_SUPPORT_EMAIL: "support@example.com",
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { usePortalGuard } from "@/hooks/api/portal/use-portal-guard";
import { useExternalPortalProjects } from "@/hooks/api/portal/use-portal-projects";
import { useAcceptInvitation } from "@/hooks/api/portal/use-accept-invitation";
import {
  PortalProjectDetailLoading,
  PortalProjectDetailError,
  PortalProjectDetailNotFound,
  PortalProjectDetail,
} from "./components/portal-project-detail";

const STUB_PROJECT = {
  id: 1,
  name: "Alpha Project",
  key: "AP",
  status: "active",
  startDate: null,
  targetEndDate: null,
};

describe("SPEC 7 — PortalProjectsPage states (Requirement C3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loading state: renders a skeleton while portal session is not yet confirmed", async () => {
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: false });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);
    expect(screen.queryByTestId("project-card-1")).toBeNull();
    expect(screen.queryByText("No projects yet")).toBeNull();
  });

  it("loading state: renders skeleton while isLoading=true even when isReady", async () => {
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: true });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });
    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);
    expect(screen.queryByText("No projects yet")).toBeNull();
    expect(screen.queryByText("Could not load projects")).toBeNull();
  });

  it("ready state: renders project cards when data is returned", async () => {
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: true });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: [STUB_PROJECT],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);
    expect(screen.getByTestId("project-card-1")).toBeInTheDocument();
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
  });

  it("empty state: renders 'No projects yet' when grant list is empty", async () => {
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: true });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("server-error state: renders error state with retry button on fetch failure", async () => {
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: true });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });
    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);
    expect(screen.getByText("Could not load projects")).toBeInTheDocument();
  });

  it("rate-limited state (429): renders error state so the UI does not crash or show empty content", async () => {
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: true });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: Object.assign(new Error("Too many requests"), { status: 429 }),
      refetch: jest.fn(),
    });
    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);
    expect(screen.getByText("Could not load projects")).toBeInTheDocument();
    expect(screen.queryByText("No projects yet")).toBeNull();
  });

  it("offline state: renders error state when network is unavailable (isError=true from failed fetch)", async () => {
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: true });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new TypeError("Failed to fetch"),
      refetch: jest.fn(),
    });
    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);
    expect(screen.getByText("Could not load projects")).toBeInTheDocument();
  });

  it("invalid/expired/revoked state: guard returns isReady=false so skeleton is shown without flashing content", async () => {
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: false });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);
    expect(screen.queryByText("Alpha Project")).toBeNull();
    expect(screen.queryByText("No projects yet")).toBeNull();
    expect(screen.queryByText("Could not load projects")).toBeNull();
  });

  it("ANTI-VACUITY: empty-vs-ready distinguishes data=[] from data=[project] so empty and ready states are not the same branch", async () => {
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: true });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: [STUB_PROJECT],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);
    expect(screen.queryByText("No projects yet")).toBeNull();
    expect(screen.getByTestId("project-card-1")).toBeInTheDocument();
  });
});

describe("SPEC 6 — AcceptInvitationPage states (Requirement C3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loading state: renders 'Verifying your invitation' while mutation is pending", async () => {
    (useAcceptInvitation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      reset: jest.fn(),
      isPending: true,
      isError: false,
      isSuccess: false,
      error: null,
    });
    const { default: AcceptInvitationPage } = await import(
      "../../app/(portal)/accept-invitation/page"
    );
    render(<AcceptInvitationPage />);
    expect(screen.getByText("Verifying your invitation…")).toBeInTheDocument();
  });

  it("invalid/expired state: renders 'Invitation expired' when error message contains 'expired'", async () => {
    (useAcceptInvitation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      reset: jest.fn(),
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error("This invitation has expired"),
    });
    const { default: AcceptInvitationPage } = await import(
      "../../app/(portal)/accept-invitation/page"
    );
    render(<AcceptInvitationPage />);
    expect(screen.getByText("Invitation expired")).toBeInTheDocument();
  });

  it("revoked/invalid state: renders 'Invitation expired' when error message contains 'invalid'", async () => {
    (useAcceptInvitation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      reset: jest.fn(),
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error("Invalid or not found"),
    });
    const { default: AcceptInvitationPage } = await import(
      "../../app/(portal)/accept-invitation/page"
    );
    render(<AcceptInvitationPage />);
    expect(screen.getByText("Invitation expired")).toBeInTheDocument();
  });

  it("rate-limited/server-error state: renders 'Could not accept invitation' with retry for non-expiry errors", async () => {
    (useAcceptInvitation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      reset: jest.fn(),
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error("Service unavailable"),
    });
    const { default: AcceptInvitationPage } = await import(
      "../../app/(portal)/accept-invitation/page"
    );
    render(<AcceptInvitationPage />);
    expect(screen.getByText("Could not accept invitation")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("no-token/first-run state: renders 'No active session' when no token param and reason=no_token", async () => {
    const navMock = require("next/navigation");
    navMock.useSearchParams = () => ({
      get: (key: string) => {
        if (key === "token") return null;
        if (key === "reason") return "no_token";
        return null;
      },
    });
    (useAcceptInvitation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      reset: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    });
    const { default: AcceptInvitationPage } = await import(
      "../../app/(portal)/accept-invitation/page"
    );
    render(<AcceptInvitationPage />);
    expect(screen.getByText("No active session")).toBeInTheDocument();
  });

  it("session-expired state: renders 'Session expired' when no token and reason=expired", async () => {
    const navMock = require("next/navigation");
    navMock.useSearchParams = () => ({
      get: (key: string) => {
        if (key === "token") return null;
        if (key === "reason") return "expired";
        return null;
      },
    });
    (useAcceptInvitation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      reset: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    });
    const { default: AcceptInvitationPage } = await import(
      "../../app/(portal)/accept-invitation/page"
    );
    render(<AcceptInvitationPage />);
    expect(screen.getByText("Session expired")).toBeInTheDocument();
  });
});

describe("SPEC 8 — PortalProjectPage sub-component states (Requirement C3)", () => {
  it("loading state: PortalProjectDetailLoading renders header (skeleton visible, no project content)", () => {
    render(<PortalProjectDetailLoading />);
    expect(screen.getByTestId("portal-header")).toBeInTheDocument();
    expect(screen.queryByText("Could not load project")).toBeNull();
    expect(screen.queryByText("Project not found")).toBeNull();
  });

  it("server-error/rate-limited state: PortalProjectDetailError renders 'Could not load project' with retry", () => {
    const onRetry = jest.fn();
    render(<PortalProjectDetailError onRetry={onRetry} />);
    expect(screen.getByText("Could not load project")).toBeInTheDocument();
  });

  it("denied/not-found state: PortalProjectDetailNotFound renders 'Project not found'", () => {
    render(<PortalProjectDetailNotFound />);
    expect(screen.getByText("Project not found")).toBeInTheDocument();
  });

  it("ready state: PortalProjectDetail renders project name when data is loaded", () => {
    const OVERVIEW = {
      project: {
        id: 42,
        name: "Beta Project",
        key: "BP",
        status: "active",
        startDate: null,
        targetEndDate: null,
      },
      capabilities: {
        canViewMilestones: false,
        canViewTasks: false,
        canViewAttachments: false,
        canViewComments: false,
        canSubmitChangeRequests: false,
      },
      milestones: [],
      tasks: [],
      attachments: [],
      comments: [],
    };
    render(<PortalProjectDetail data={OVERVIEW} />);
    expect(screen.getByText("Beta Project")).toBeInTheDocument();
  });

  it("empty state: PortalProjectDetail with all empty sub-arrays renders project name without crashing", () => {
    const EMPTY_OVERVIEW = {
      project: {
        id: 99,
        name: "Empty Project",
        key: "EP",
        status: "active",
        startDate: null,
        targetEndDate: null,
      },
      capabilities: undefined,
      milestones: [],
      tasks: [],
      attachments: [],
      comments: [],
    };
    render(<PortalProjectDetail data={EMPTY_OVERVIEW} />);
    expect(screen.getByText("Empty Project")).toBeInTheDocument();
  });

  it("ANTI-VACUITY: error and not-found states render different text so they are distinct branches", () => {
    const { unmount } = render(
      <PortalProjectDetailError onRetry={jest.fn()} />,
    );
    expect(screen.getByText("Could not load project")).toBeInTheDocument();
    expect(screen.queryByText("Project not found")).toBeNull();
    unmount();

    render(<PortalProjectDetailNotFound />);
    expect(screen.getByText("Project not found")).toBeInTheDocument();
    expect(screen.queryByText("Could not load project")).toBeNull();
  });
});
