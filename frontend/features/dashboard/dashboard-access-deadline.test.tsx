/**
 * PRD-C144 — Home never starts an unbounded wait, on the client either.
 *
 * `/me/access` gates every widget's mount, so while it is in flight the page
 * renders its own skeleton and ZERO sections. Its only ceiling used to be the
 * transport's: `REQUEST_TIMEOUT_MS` (30s) x `MAX_QUERY_RETRIES` (1) = ~60s of
 * blank page, 24x the server's own 2,500ms section deadline. These cases drive
 * the real component with an access read that never answers and assert on what
 * is on screen either side of the deadline.
 */

import { act, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DashboardAccess } from "./use-dashboard-access";
import { HOME_ACCESS_DEADLINE_MS } from "./dashboard-hydration";

const refetchAccess = jest.fn();

const accessState: { current: DashboardAccess } = {
  current: unresolvedAccess(),
};

function unresolvedAccess(): DashboardAccess {
  return {
    accessLoading: true,
    accessResolved: false,
    refetchAccess,
    hrEnabled: false,
    crmEnabled: false,
    projectsEnabled: false,
    payrollEnabled: false,
    signEnabled: false,
    canViewEmployees: false,
    canCreateEmployees: false,
    canViewAttendance: false,
    canSelfAttendance: false,
    canViewLeaves: false,
    canApproveLeaves: false,
    canViewExecutive: false,
    canViewCrmLeads: false,
    canViewCrmReports: false,
    canViewTickets: false,
    canViewPayrollSelf: false,
    canViewSignEnvelopes: false,
  };
}

jest.mock("next/dynamic", () => () => () => null);

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Ada" }, orgId: "org_1" } }),
}));

jest.mock("@/hooks/api/dashboard", () => ({
  useDashboardStats: () => ({
    data: { orgName: "Acme", totalEmployees: 4 },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useMyIssues: () => ({ data: [], isLoading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("./use-dashboard-access", () => ({
  useDashboardAccess: () => accessState.current,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({
    data: { isOrgOwner: true, scopes: {}, modules: {} },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined, isLoading: false }),
}));

jest.mock("./module-setup-banners", () => ({
  ModuleSetupBanners: () => null,
  useModuleSetupBannersPending: () => false,
}));

jest.mock("./dashboard-deferred-body", () => ({
  DashboardDeferredBody: () => <div data-testid="home-sections" />,
}));

jest.mock("@/features/dashboard/quick-actions", () => ({
  QuickActions: () => null,
}));

import { DashboardClient } from "./dashboard-client";

function renderDashboard() {
  return render(
    <TooltipProvider>
      <DashboardClient />
    </TooltipProvider>,
  );
}

function elapse(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe("PRD-C144 — the Home access gate is time-boxed", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    refetchAccess.mockClear();
    accessState.current = unresolvedAccess();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("MEASURED: holds the loading skeleton while access is in flight and inside the deadline", () => {
    renderDashboard();
    elapse(HOME_ACCESS_DEADLINE_MS - 1);

    expect(screen.getByLabelText("Loading dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("MEASURED: stops waiting once the deadline passes — the page no longer renders the skeleton", () => {
    renderDashboard();
    elapse(HOME_ACCESS_DEADLINE_MS + 1);

    expect(screen.queryByLabelText("Loading dashboard")).not.toBeInTheDocument();
  });

  it("MEASURED: hands back an announced error with a retry, NOT a zero-widget grid", () => {
    renderDashboard();
    elapse(HOME_ACCESS_DEADLINE_MS + 1);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Home is unavailable");
    expect(screen.queryByTestId("home-sections")).not.toBeInTheDocument();

    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetchAccess).toHaveBeenCalledTimes(1);
  });

  it("MEASURED: an access read that answers inside the deadline renders the sections, not the error", () => {
    const { rerender } = renderDashboard();
    accessState.current = { ...unresolvedAccess(), accessLoading: false, accessResolved: true };
    rerender(
      <TooltipProvider>
        <DashboardClient />
      </TooltipProvider>,
    );
    elapse(HOME_ACCESS_DEADLINE_MS + 1);

    expect(screen.getByTestId("home-sections")).toBeInTheDocument();
    expect(screen.queryByText("Home is unavailable")).not.toBeInTheDocument();
  });
});
