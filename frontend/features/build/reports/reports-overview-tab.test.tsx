import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const useAccess = jest.fn();
const accessGranted = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};
const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const useProjectAnalytics = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => useAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build", () => ({
  useProjectAnalytics: (projectId: number) => useProjectAnalytics(projectId),
}));

jest.mock("@/features/build/analytics/analytics-kpi-strip", () => ({
  AnalyticsKpiStrip: () => <div data-testid="kpi-strip" />,
  AnalyticsKpiStripSkeleton: () => <div data-testid="kpi-strip-skeleton" />,
}));

jest.mock("@/features/build/analytics/project-charts", () => ({
  StateDistributionChart: () => <div data-testid="chart-state" />,
  PriorityBreakdownChart: () => <div data-testid="chart-priority" />,
  VolumeOverTimeChart: () => <div data-testid="chart-volume" />,
  AssigneeCompletionChart: () => <div data-testid="chart-assignee" />,
  CycleVelocityChart: () => <div data-testid="chart-velocity" />,
  EstimateVsActualChart: () => <div data-testid="chart-estimate" />,
  STATE_COLORS: {},
  PRIORITY_COLORS: {},
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: { children?: ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

import { ReportsOverviewTab } from "./reports-overview-tab";

const ANALYTICS = {
  stateDistribution: [{ status: "DONE", count: 3 }],
  priorityBreakdown: [{ priority: "high", count: 2 }],
  assigneeCompletion: [
    { assigneeId: "u1", assigneeName: "Ada", total: 4, completed: 2 },
  ],
  volumeOverTime: [{ week: "2026-01-05", count: 5 }],
  cycleVelocity: [{ cycleId: 1, cycleName: "Cycle 1", completedPoints: 8 }],
  estimateVsActual: [
    { ticketId: 1, title: "Ticket", estimated: "5", actual: 3 },
  ],
};

function settled<T>(data: T) {
  return { data, isLoading: false, isError: false, error: null, refetch: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAccess.mockReturnValue(accessGranted);
  useProjectAnalytics.mockReturnValue(settled(ANALYTICS));
});

describe("ReportsOverviewTab — access gate is three-valued (FE-40/41)", () => {
  it("never shows an access denial while the access snapshot is still loading", () => {
    useAccess.mockReturnValue({ data: undefined, isLoading: true });

    render(<ReportsOverviewTab projectId={1} />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.queryByTestId("kpi-strip")).toBeNull();
  });

  it("shows NoPermissionState once build:view has definitively said no", () => {
    useAccess.mockReturnValue(accessDenied);
    useProjectAnalytics.mockReturnValue(settled(undefined));

    render(<ReportsOverviewTab projectId={1} />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByText(/no analytics yet/i)).toBeNull();
  });
});

describe("ReportsOverviewTab — the four remaining page states (FE-40/41)", () => {
  it("shows the loading skeleton while the analytics read is in flight", () => {
    useProjectAnalytics.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ReportsOverviewTab projectId={1} />);

    expect(screen.getByTestId("kpi-strip-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("kpi-strip")).toBeNull();
  });

  it("shows the empty state when the analytics read finishes with no data", () => {
    useProjectAnalytics.mockReturnValue(settled(undefined));

    render(<ReportsOverviewTab projectId={1} />);

    expect(screen.getByText(/no analytics yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId("kpi-strip")).toBeNull();
  });

  it("shows the error state with a retry button when the analytics read fails", async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    useProjectAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network timeout"),
      refetch,
    });

    const user = userEvent.setup();
    render(<ReportsOverviewTab projectId={1} />);

    const retryButton = screen.getByRole("button", { name: /try again|retry/i });
    expect(retryButton).toBeInTheDocument();
    await user.click(retryButton);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders the KPI strip and all six charts when analytics data is present", () => {
    render(<ReportsOverviewTab projectId={1} />);

    expect(screen.getByTestId("kpi-strip")).toBeInTheDocument();
    expect(screen.getByTestId("chart-state")).toBeInTheDocument();
    expect(screen.getByTestId("chart-priority")).toBeInTheDocument();
    expect(screen.getByTestId("chart-volume")).toBeInTheDocument();
    expect(screen.getByTestId("chart-assignee")).toBeInTheDocument();
    expect(screen.getByTestId("chart-velocity")).toBeInTheDocument();
    expect(screen.getByTestId("chart-estimate")).toBeInTheDocument();
  });
});
