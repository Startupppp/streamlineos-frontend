"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockReplace = jest.fn();
const mockUseSearchParams = jest.fn();
const mockUsePortalGuard = jest.fn();
const mockUseExternalPortalProjects = jest.fn();

const INVITE_TOKEN = "inv-tok-super-secret-one-time-exchange-abc123";
const GRANT_TOKEN = "eyJhbGciOiJIUzI1NiJ9.portal-grant-bearer-secret-xyz789";
const GRANT_ID = "pgc-internal-uuid-secret-should-not-leak-to-portal";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/client-portal",
  useSearchParams: () => mockUseSearchParams(),
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

jest.mock("@/hooks/api/portal/use-portal-guard", () => ({
  usePortalGuard: () => mockUsePortalGuard(),
}));

jest.mock("@/hooks/api/portal/use-portal-projects", () => ({
  useExternalPortalProjects: (...args: unknown[]) => mockUseExternalPortalProjects(...args),
}));

jest.mock("@/hooks/api/portal/use-accept-invitation", () => ({
  useAcceptInvitation: jest.fn(),
}));

jest.mock("@/lib/portal-api-client", () => ({
  PortalApiError: jest.requireActual<typeof import("@/lib/portal-api-client")>("@/lib/portal-api-client").PortalApiError,
  setPortalToken: jest.fn(),
  getPortalToken: jest.fn(),
  clearPortalToken: jest.fn(),
  portalTokenScope: jest.fn().mockReturnValue("portal:anon"),
  PORTAL_ANONYMOUS_SCOPE: "portal:anonymous",
}));

jest.mock("@/lib/branding", () => ({
  BRAND_SUPPORT_EMAIL: "support@example.com",
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { useAcceptInvitation } from "@/hooks/api/portal/use-accept-invitation";
import { getPortalToken, PortalApiError } from "@/lib/portal-api-client";

const STUB_PROJECT = {
  id: 7,
  name: "Redaction Test Project",
  key: "RTP",
  status: "active",
  startDate: null,
  targetEndDate: null,
};

function makeSearchParams(token: string | null) {
  return new URLSearchParams(token ? { token } : undefined);
}

function makePendingMutation() {
  return {
    isPending: true,
    isError: false,
    isSuccess: false,
    error: null,
    mutate: jest.fn(),
    reset: jest.fn(),
  };
}

function makeErrorMutation(message: string) {
  return {
    isPending: false,
    isError: true,
    isSuccess: false,
    error: new Error(message),
    mutate: jest.fn(),
    reset: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
});

describe("Portal waiting filter recovery", () => {
  it("shows safe recovery and clears waiting while preserving the current URL", async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("waiting=true&status=active&cursor=7"));
    mockUsePortalGuard.mockReturnValue({ isReady: true });
    mockUseExternalPortalProjects.mockReturnValue({ isError: true, error: new PortalApiError(
      `${INVITE_TOKEN} ${GRANT_TOKEN} ${GRANT_ID}`, 400, "PORTAL_WAITING_FILTER_UNAVAILABLE",
    ), refetch: jest.fn() });
    const { default: PortalProjectsPage } = await import("../../app/(portal)/client-portal/page");
    const { rerender } = render(<PortalProjectsPage />);
    expect(mockUseExternalPortalProjects).toHaveBeenLastCalledWith({ waiting: true });
    expect(screen.getByText('Approval filtering is unavailable. Turn off "Awaiting my approval" to view your projects.')).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Awaiting my approval" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("data-slot", "button");
    expect(toggle).toHaveClass("bg-primary", "text-primary-foreground");
    expect(document.body.innerHTML).not.toContain(INVITE_TOKEN);
    expect(document.body.innerHTML).not.toContain(GRANT_TOKEN);
    expect(document.body.innerHTML).not.toContain(GRANT_ID);
    await userEvent.click(toggle);
    expect(mockReplace).toHaveBeenCalledWith("?status=active&cursor=7", { scroll: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams(mockReplace.mock.calls[0][0]));
    mockUseExternalPortalProjects.mockReturnValue({
      data: { pages: [{ data: [STUB_PROJECT], hasMore: false, nextCursor: null }] },
      isLoading: false, isError: false, refetch: jest.fn(), fetchNextPage: jest.fn(),
      hasNextPage: false, isFetchingNextPage: false,
    });
    rerender(<PortalProjectsPage />);
    expect(mockUseExternalPortalProjects).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByTestId("project-card-7")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveClass("border-input", "bg-card");
    expect(screen.queryByText(/Approval filtering is unavailable/)).not.toBeInTheDocument();
  });

  it.each([new Error(GRANT_TOKEN), new PortalApiError(INVITE_TOKEN, 403, "PORTAL_GRANT_REVOKED")])(
    "keeps unrelated failures generic and secret-safe (case %#)", async (error) => {
      mockUsePortalGuard.mockReturnValue({ isReady: true });
      const refetch = jest.fn();
      mockUseExternalPortalProjects.mockReturnValue({ isError: true, error, refetch });
      const { default: PortalProjectsPage } = await import("../../app/(portal)/client-portal/page");
      render(<PortalProjectsPage />);
      expect(screen.getByText("There was a problem fetching your projects. Please try again.")).toBeInTheDocument();
      expect(document.body.innerHTML).not.toContain(error.message);
      await userEvent.click(screen.getByRole("button", { name: /try again/i }));
      expect(refetch).toHaveBeenCalledTimes(1);
    },
  );
});

describe("SPEC C6 — invitation token is never rendered in the DOM", () => {
  it("does not expose the raw invite token while the acceptance mutation is pending", async () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams(INVITE_TOKEN));
    (useAcceptInvitation as jest.Mock).mockReturnValue(makePendingMutation());

    const { default: AcceptInvitationPage } = await import(
      "../../app/(portal)/accept-invitation/page"
    );
    render(<AcceptInvitationPage />);

    expect(document.body.innerHTML).not.toContain(INVITE_TOKEN);
    expect(screen.getByText("Verifying your invitation…")).toBeInTheDocument();
  });

  it("does not expose the raw invite token in the expired/error state", async () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams(INVITE_TOKEN));
    (useAcceptInvitation as jest.Mock).mockReturnValue(
      makeErrorMutation("This invitation link has expired"),
    );

    const { default: AcceptInvitationPage } = await import(
      "../../app/(portal)/accept-invitation/page"
    );
    render(<AcceptInvitationPage />);

    expect(document.body.innerHTML).not.toContain(INVITE_TOKEN);
    expect(screen.getByText("Invitation expired")).toBeInTheDocument();
  });
});

describe("SPEC C6 — portal session JWT (grant token) is never rendered in the DOM", () => {
  it("does not render the bearer token while the portal projects page is loading", async () => {
    (getPortalToken as jest.Mock).mockReturnValue(GRANT_TOKEN);
    mockUsePortalGuard.mockReturnValue({ isReady: false });
    mockUseExternalPortalProjects.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });

    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);

    expect(document.body.innerHTML).not.toContain(GRANT_TOKEN);
    expect(document.body.innerHTML).toContain("Your projects");
  });

  it("does not render the bearer token in the portal projects ready state", async () => {
    (getPortalToken as jest.Mock).mockReturnValue(GRANT_TOKEN);
    mockUsePortalGuard.mockReturnValue({ isReady: true });
    mockUseExternalPortalProjects.mockReturnValue({
      data: { pages: [{ data: [STUB_PROJECT], hasMore: false, nextCursor: null }] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);

    expect(document.body.innerHTML).not.toContain(GRANT_TOKEN);
    expect(screen.getByText("Redaction Test Project")).toBeInTheDocument();
  });
});

describe("SPEC C6 — internal grant identifier is never exposed in the external portal view", () => {
  it("does not render the internal grant UUID in the portal project list", async () => {
    (getPortalToken as jest.Mock).mockReturnValue("valid-portal-jwt");
    mockUsePortalGuard.mockReturnValue({ isReady: true });
    mockUseExternalPortalProjects.mockReturnValue({
      data: { pages: [{ data: [{ ...STUB_PROJECT, _internalGrantId: GRANT_ID }], hasMore: false, nextCursor: null }] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);

    expect(document.body.innerHTML).not.toContain(GRANT_ID);
    expect(screen.getByTestId("project-card-7")).toBeInTheDocument();
  });

  it("does not embed the internal grant UUID in any rendered href or attribute", async () => {
    (getPortalToken as jest.Mock).mockReturnValue("valid-portal-jwt");
    mockUsePortalGuard.mockReturnValue({ isReady: true });
    mockUseExternalPortalProjects.mockReturnValue({
      data: { pages: [{ data: [STUB_PROJECT], hasMore: false, nextCursor: null }] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { default: PortalProjectsPage } = await import(
      "../../app/(portal)/client-portal/page"
    );
    render(<PortalProjectsPage />);

    expect(document.body.innerHTML).not.toContain(GRANT_ID);
    expect(screen.getByTestId("project-card-7")).toHaveTextContent(
      "Redaction Test Project",
    );
  });
});
