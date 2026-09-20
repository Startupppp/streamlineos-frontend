import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const useCanState = jest.fn();
const useProjectAnalytics = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCanState: (key: string) => useCanState(key),
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
    div: ({ children, ...rest }: { children?: ReactNode }) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

import { ProjectAnalyticsPage } from "./project-analytics-page";

const ANALYTICS = {
  stateDistribution: [{ status: "DONE", count: 3 }],
  priorityBreakdown: [{ priority: "high", count: 2 }],
  assigneeCompletion: [{ assigneeId: "u1", assigneeName: "Ada", total: 4, completed: 2 }],
  volumeOverTime: [{ week: "2026-01-05", count: 5 }],
  cycleVelocity: [{ cycleId: 1, cycleName: "Cycle 1", completedPoints: 8 }],
  estimateVsActual: [{ ticketId: 1, title: "Ticket", estimated: "5", actual: 3 }],
  healthScore: 72,
  healthStatus: "GOOD",
  healthBreakdown: {
    completionPct: 50,
    onTimePct: 80,
    velocityScore: 90,
    overdueTickets: 1,
    totalTickets: 6,
  },
};

function settled<T>(data: T) {
  return { data, isLoading: false, isError: false, error: null, refetch: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  useCanState.mockReturnValue("granted");
  useProjectAnalytics.mockReturnValue(settled(ANALYTICS));
});

describe("ProjectAnalyticsPage — access is three-valued, not a boolean", () => {
  it("shows the loading skeleton while the access snapshot is still in flight, never an access denial", () => {
    useCanState.mockReturnValue("loading");

    render(<ProjectAnalyticsPage projectId={101} />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.queryByTestId("kpi-strip")).toBeNull();
  });

  it("renders NoPermissionState once build:view has actually said no, instead of falling through to the empty state", () => {
    useCanState.mockReturnValue("denied");
    useProjectAnalytics.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });

    render(<ProjectAnalyticsPage projectId={101} />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByText(/no analytics yet/i)).toBeNull();
  });
});

describe("ProjectAnalyticsPage — the four remaining states", () => {
  it("renders the error state with a retry when the analytics read fails", () => {
    useProjectAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network timeout"),
      refetch: jest.fn(),
    });

    render(<ProjectAnalyticsPage projectId={101} />);

    expect(screen.getByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
  });

  it("renders the empty state once the read has finished with no analytics", () => {
    useProjectAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProjectAnalyticsPage projectId={101} />);

    expect(screen.getByText(/no analytics yet/i)).toBeInTheDocument();
  });

  it("renders the KPI strip and charts once analytics has loaded", () => {
    render(<ProjectAnalyticsPage projectId={101} />);

    expect(screen.getByTestId("kpi-strip")).toBeInTheDocument();
    expect(screen.getByTestId("chart-state")).toBeInTheDocument();
    expect(screen.getByTestId("chart-estimate")).toBeInTheDocument();
  });
});
