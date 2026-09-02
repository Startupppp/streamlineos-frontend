import { render, screen } from "@testing-library/react";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
}));

jest.mock("@/components/ui/app-loading-screen", () => ({
  AppLoadingScreen: () => <div data-testid="app-loading-screen" />,
}));

import { useSession } from "next-auth/react";
import { useAccess } from "@/hooks/api/access";
import { DashboardGate } from "./dashboard-gate";

const mockUseSession = useSession as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

function signedIn(): void {
  mockUseSession.mockReturnValue({
    data: { user: { id: "u1", role: "MEMBER" } },
    status: "authenticated",
  });
}

function accessResult(overrides: Record<string, unknown>): void {
  mockUseAccess.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  });
}

describe("DashboardGate — a failed authorization read is not a refusal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signedIn();
  });

  it("says the access check failed, and offers a retry", () => {
    accessResult({ isError: true });
    render(
      <DashboardGate permission="hr:employees:view">
        <div>secret</div>
      </DashboardGate>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't check your access/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("BITE PROOF — it must not tell the reader they lack the permission", () => {
    accessResult({ isError: true });
    render(
      <DashboardGate permission="hr:employees:view">
        <div>secret</div>
      </DashboardGate>,
    );
    expect(screen.queryByText(/access restricted/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/you don't have permission to view this page/i),
    ).not.toBeInTheDocument();
  });

  it("still renders the branded loading screen while the read is in flight", () => {
    accessResult({ isLoading: true });
    render(
      <DashboardGate permission="hr:employees:view">
        <div>secret</div>
      </DashboardGate>,
    );
    expect(screen.getByTestId("app-loading-screen")).toBeInTheDocument();
  });

  it("still refuses a genuine denial once access was actually read", () => {
    accessResult({ data: { isOrgOwner: false, scopes: {} } });
    render(
      <DashboardGate permission="hr:employees:view">
        <div>secret</div>
      </DashboardGate>,
    );
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("still admits a holder of the permission", () => {
    accessResult({ data: { isOrgOwner: false, scopes: { "hr:employees:view": "all" } } });
    render(
      <DashboardGate permission="hr:employees:view">
        <div>secret</div>
      </DashboardGate>,
    );
    expect(screen.getByText("secret")).toBeInTheDocument();
  });
});
