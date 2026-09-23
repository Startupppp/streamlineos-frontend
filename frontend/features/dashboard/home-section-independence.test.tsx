/**
 * PRD-C144 — Home renders the sections that are ready without waiting for the
 * slowest one, and a failed section replaces only itself.
 *
 * Every section is driven at once through the real DashboardDeferredBody with
 * one hook loading forever, one rejected and the rest answered. Asserting on
 * what is on screen is the only way to see this: the declared prop types are
 * identical in all three states.
 */

import { act, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardDeferredBody } from "./dashboard-deferred-body";
import type { DashboardAccess } from "./use-dashboard-access";

const refetch = jest.fn();

const hookState = {
  recentProjects: { data: undefined as unknown, isLoading: true, error: null as unknown, refetch },
  teamAttendance: { data: undefined as unknown, isLoading: true, error: null as unknown, refetch },
  recentActivity: { data: undefined as unknown, isLoading: true, error: null as unknown, refetch },
  myIssues: { data: undefined as unknown, isLoading: true, error: null as unknown, refetch },
  activeSprint: { data: undefined as unknown, isLoading: true, error: null as unknown, refetch },
};

jest.mock("@/hooks/api/dashboard", () => ({
  useRecentProjects: () => hookState.recentProjects,
  useTeamAttendance: () => hookState.teamAttendance,
  useRecentActivity: () => hookState.recentActivity,
  useMyIssues: () => hookState.myIssues,
  useActiveSprintSummary: () => hookState.activeSprint,
}));

jest.mock("./home-widget-grid", () => ({
  HomeWidgetGrid: () => <div data-testid="home-widget-grid" />,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

let reveal: (() => void) | undefined;

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    reveal = () =>
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = "0px";
  thresholds = [0];
}

function access(): DashboardAccess {
  return {
    accessLoading: false,
    accessResolved: true,
    refetchAccess: jest.fn(),
    hrEnabled: false,
    crmEnabled: false,
    projectsEnabled: true,
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
    canViewTickets: true,
    canViewPayrollSelf: false,
    canViewSignEnvelopes: false,
  };
}

function renderHome() {
  return render(
    <TooltipProvider>
      <DashboardDeferredBody access={access()} />
    </TooltipProvider>,
  );
}

describe("PRD-C144 — Home sections resolve independently", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reveal = undefined;
    window.IntersectionObserver = IntersectionObserverMock;

    hookState.myIssues = {
      data: [
        {
          id: 11,
          type: "TASK",
          status: "IN_PROGRESS",
          ticketNumber: 7,
          title: "Answered ticket section",
          priority: "HIGH",
          projectId: 3,
          projectName: "Apollo",
          projectKey: "APO",
        },
      ],
      isLoading: false,
      error: null,
      refetch,
    };
    hookState.recentActivity = {
      data: [
        {
          id: 21,
          title: "Answered activity section",
          status: "DONE",
          updatedAt: "2026-09-03T00:00:00.000Z",
        },
      ],
      isLoading: false,
      error: null,
      refetch,
    };
    hookState.activeSprint = { data: undefined, isLoading: true, error: null, refetch };
    hookState.recentProjects = {
      data: undefined,
      isLoading: false,
      error: new Error("recent projects source is down"),
      refetch,
    };
    hookState.teamAttendance = { data: { records: [] }, isLoading: false, error: null, refetch };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("MEASURED: an answered section renders while a sibling is still loading and another has failed", async () => {
    renderHome();
    act(() => reveal?.());
    await act(async () => { jest.advanceTimersByTime(1600); });

    expect(screen.getByText("Answered ticket section")).toBeInTheDocument();
    expect(screen.getByText("Answered activity section")).toBeInTheDocument();
    expect(screen.getByText("recent projects source is down")).toBeInTheDocument();

    expect(screen.queryByText(/Sprint answered/)).not.toBeInTheDocument();
    expect(screen.getByText("Active Sprint")).toBeInTheDocument();
  });

  it("MEASURED: the failed section states the error in an alert and offers its own retry", async () => {
    renderHome();
    act(() => reveal?.());
    await act(async () => { jest.advanceTimersByTime(1600); });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("recent projects source is down");

    const retries = screen.getAllByRole("button", { name: /retry/i });
    expect(retries.length).toBeGreaterThan(0);
  });

  it("MEASURED: no section is rendered before the deferred body becomes visible", () => {
    renderHome();
    expect(screen.queryByText("Answered ticket section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-widget-grid")).not.toBeInTheDocument();
  });
});
