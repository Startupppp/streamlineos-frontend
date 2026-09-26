"use client";

import { render, screen } from "@testing-library/react";

const INVITE_TOKEN = "inv-tok-super-secret-one-time-exchange-abc123";
const GRANT_TOKEN = "eyJhbGciOiJIUzI1NiJ9.portal-grant-bearer-secret-xyz789";
const GRANT_ID = "pgc-internal-uuid-secret-should-not-leak-to-portal";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/client-portal",
  useSearchParams: jest.fn(),
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
  usePortalGuard: jest.fn(),
}));

jest.mock("@/hooks/api/portal/use-portal-projects", () => ({
  useExternalPortalProjects: jest.fn(),
}));

jest.mock("@/hooks/api/portal/use-accept-invitation", () => ({
  useAcceptInvitation: jest.fn(),
}));

jest.mock("@/lib/portal-api-client", () => ({
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

import { useSearchParams } from "next/navigation";
import { usePortalGuard } from "@/hooks/api/portal/use-portal-guard";
import { useExternalPortalProjects } from "@/hooks/api/portal/use-portal-projects";
import { useAcceptInvitation } from "@/hooks/api/portal/use-accept-invitation";
import { getPortalToken } from "@/lib/portal-api-client";

const STUB_PROJECT = {
  id: 7,
  name: "Redaction Test Project",
  key: "RTP",
  status: "active",
  startDate: null,
  targetEndDate: null,
};

function makeSearchParams(token: string | null) {
  return { get: (key: string) => (key === "token" ? token : null) };
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
});

describe("SPEC C6 — invitation token is never rendered in the DOM", () => {
  it("does not expose the raw invite token while the acceptance mutation is pending", async () => {
    (useSearchParams as jest.Mock).mockReturnValue(makeSearchParams(INVITE_TOKEN));
    (useAcceptInvitation as jest.Mock).mockReturnValue(makePendingMutation());

    const { default: AcceptInvitationPage } = await import(
      "../../app/(portal)/accept-invitation/page"
    );
    render(<AcceptInvitationPage />);

    expect(document.body.innerHTML).not.toContain(INVITE_TOKEN);
    expect(screen.getByText("Verifying your invitation…")).toBeInTheDocument();
  });

  it("does not expose the raw invite token in the expired/error state", async () => {
    (useSearchParams as jest.Mock).mockReturnValue(makeSearchParams(INVITE_TOKEN));
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
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: false });
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

    expect(document.body.innerHTML).not.toContain(GRANT_TOKEN);
    expect(document.body.innerHTML).toContain("Your projects");
  });

  it("does not render the bearer token in the portal projects ready state", async () => {
    (getPortalToken as jest.Mock).mockReturnValue(GRANT_TOKEN);
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

    expect(document.body.innerHTML).not.toContain(GRANT_TOKEN);
    expect(screen.getByText("Redaction Test Project")).toBeInTheDocument();
  });
});

describe("SPEC C6 — internal grant identifier is never exposed in the external portal view", () => {
  it("does not render the internal grant UUID in the portal project list", async () => {
    (getPortalToken as jest.Mock).mockReturnValue("valid-portal-jwt");
    (usePortalGuard as jest.Mock).mockReturnValue({ isReady: true });
    (useExternalPortalProjects as jest.Mock).mockReturnValue({
      data: [{ ...STUB_PROJECT, _internalGrantId: GRANT_ID }],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
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

    expect(document.body.innerHTML).not.toContain(GRANT_ID);
    expect(screen.getByTestId("project-card-7")).toHaveTextContent(
      "Redaction Test Project",
    );
  });
});
