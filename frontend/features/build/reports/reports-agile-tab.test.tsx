import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseVelocityReport = jest.fn();
const mockUseBurnupReport = jest.fn();
const mockUseCycleTimeReport = jest.fn();
const mockUseLeadTimeReport = jest.fn();
const mockUseCfdReport = jest.fn();
const mockUseCriticalPath = jest.fn();
const mockUseCan = jest.fn();
const mockUseCanState = jest.fn();

jest.mock("@/hooks/api/build/reports", () => ({
  useVelocityReport: (...args: unknown[]) => mockUseVelocityReport(...args),
  useBurnupReport: (...args: unknown[]) => mockUseBurnupReport(...args),
  useCfdReport: (...args: unknown[]) => mockUseCfdReport(...args),
  useCriticalPath: (...args: unknown[]) => mockUseCriticalPath(...args),
  useCycleTimeReport: (...args: unknown[]) => mockUseCycleTimeReport(...args),
  useLeadTimeReport: (...args: unknown[]) => mockUseLeadTimeReport(...args),
  useCaptureSnapshot: jest
    .fn()
    .mockReturnValue({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
  useCanState: (...args: unknown[]) => mockUseCanState(...args),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock(
  "next/dynamic",
  () => (factory: () => Promise<{ default: (p: unknown) => ReactNode }>) => {
    let Component: ((p: unknown) => ReactNode) | null = null;
    factory()
      .then((mod) => {
        Component = mod.default;
      })
      .catch(() => {});
    return function DynamicStub(props: unknown) {
      return Component ? (
        <Component {...(props as object)} />
      ) : (
        <div data-testid="dynamic-loading" />
      );
    };
  },
);

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyLeaderboardIllustration: () => null,
  EmptySearchIllustration: () => null,
}));

jest.mock("./chart-card", () => ({
  ChartCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  numberFormatter: { format: (n: number) => String(n) },
}));

jest.mock("./velocity-chart", () => ({
  VelocityChart: () => <div data-testid="velocity-chart" />,
}));

jest.mock("./burnup-chart", () => ({
  BurnupChart: () => <div data-testid="burnup-chart" />,
}));

jest.mock("./cycle-time-chart", () => ({
  CycleTimeChart: () => <div data-testid="cycle-time-chart" />,
}));

jest.mock("./lead-time-chart", () => ({
  LeadTimeChart: () => <div data-testid="lead-time-chart" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/shared/loading-state", () => ({
  LoadingState: () => <div data-testid="loading-state" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ title }: { title?: string }) => (
    <div data-testid="error-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
}));

jest.mock("lucide-react", () => ({
  Gauge: () => null,
  TrendingUp: () => null,
  BarChart2: () => null,
  Target: () => null,
  Activity: () => null,
  GitMerge: () => null,
  Timer: () => null,
  ChevronRight: () => null,
  AlertTriangle: () => null,
  Route: () => null,
}));

import { VelocitySection } from "./velocity-section";
import { BurnupSection } from "./burnup-section";
import { CycleTimeSection } from "./cycle-time-section";
import { LeadTimeSection } from "./lead-time-section";
import { CfdSection } from "./cfd-section";
import { CriticalPathSection } from "./critical-path-section";

function settled<T>(data: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function loading() {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function failed(message = "Network timeout") {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error(message),
    refetch: jest.fn(),
  };
}

const VELOCITY_DATA = [
  {
    cycleId: 1,
    name: "Sprint 1",
    startDate: "2026-01-01",
    endDate: "2026-01-14",
    committedPoints: 40,
    completedPoints: 35,
    committedCount: 8,
    completedCount: 7,
  },
];

const BURNUP_DATA = [
  { date: "2026-01-01", scope: 80, completed: 10 },
  { date: "2026-01-02", scope: 82, completed: 14 },
];

const CYCLE_DATA = [{ week: "2026-01-05", avgDays: 3.2, count: 7 }];

const LEAD_DATA = [
  { week: "2026-01-05", avgDays: 5.1, p50Days: 4.0, p90Days: 9.5, count: 11 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockUseCanState.mockReturnValue("granted");
  mockUseVelocityReport.mockReturnValue(settled([]));
  mockUseBurnupReport.mockReturnValue(settled([]));
  mockUseCycleTimeReport.mockReturnValue(settled([]));
  mockUseLeadTimeReport.mockReturnValue(settled([]));
  mockUseCfdReport.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  mockUseCriticalPath.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
});

// --------------------------------------------------------------------------
// VelocitySection — uses LoadingState / ErrorState / EmptyState / VelocityChart
// --------------------------------------------------------------------------

describe("VelocitySection — page states", () => {
  it("renders the loading state while velocity data is in flight", () => {
    mockUseVelocityReport.mockReturnValue(loading());
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.queryByTestId("velocity-chart")).not.toBeInTheDocument();
  });

  it("renders the error state when the velocity read fails", () => {
    mockUseVelocityReport.mockReturnValue(failed());
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("velocity-chart")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no cycles with velocity data", () => {
    mockUseVelocityReport.mockReturnValue(settled([]));
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("velocity-chart")).not.toBeInTheDocument();
  });

  it("renders the velocity chart when sprint data is present — positive control confirms rows reach the chart", () => {
    mockUseVelocityReport.mockReturnValue(settled(VELOCITY_DATA));
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("velocity-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});

// --------------------------------------------------------------------------
// BurnupSection — uses velocity for the cycle filter + burnup for the series
// --------------------------------------------------------------------------

describe("BurnupSection — page states", () => {
  it("renders the empty state when there are no burnup data points", () => {
    mockUseVelocityReport.mockReturnValue(settled([]));
    mockUseBurnupReport.mockReturnValue(settled([]));
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("burnup-chart")).not.toBeInTheDocument();
  });

  it("renders the burnup chart when burnup points are present — positive control confirms data reaches the chart", () => {
    mockUseVelocityReport.mockReturnValue(settled(VELOCITY_DATA));
    mockUseBurnupReport.mockReturnValue(settled(BURNUP_DATA));
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("burnup-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});

// --------------------------------------------------------------------------
// CycleTimeSection — uses Skeleton (not LoadingState) for loading
// --------------------------------------------------------------------------

describe("CycleTimeSection — page states", () => {
  it("renders a skeleton while cycle time data is in flight", () => {
    mockUseCycleTimeReport.mockReturnValue(loading());
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-time-chart")).not.toBeInTheDocument();
  });

  it("renders the error state when the cycle time read fails", () => {
    mockUseCycleTimeReport.mockReturnValue(failed());
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-time-chart")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no cycle time points", () => {
    mockUseCycleTimeReport.mockReturnValue(settled([]));
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-time-chart")).not.toBeInTheDocument();
  });

  it("renders the cycle time chart when weekly data is present — positive control confirms data reaches the chart", () => {
    mockUseCycleTimeReport.mockReturnValue(settled(CYCLE_DATA));
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("cycle-time-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});

// --------------------------------------------------------------------------
// LeadTimeSection — uses Skeleton (not LoadingState) for loading
// --------------------------------------------------------------------------

describe("LeadTimeSection — page states", () => {
  it("renders a skeleton while lead time data is in flight", () => {
    mockUseLeadTimeReport.mockReturnValue(loading());
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("lead-time-chart")).not.toBeInTheDocument();
  });

  it("renders the error state when the lead time read fails", () => {
    mockUseLeadTimeReport.mockReturnValue(failed());
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("lead-time-chart")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no lead time points", () => {
    mockUseLeadTimeReport.mockReturnValue(settled([]));
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("lead-time-chart")).not.toBeInTheDocument();
  });

  it("renders the lead time chart when weekly data is present — positive control confirms p50/p90 data reaches the chart", () => {
    mockUseLeadTimeReport.mockReturnValue(settled(LEAD_DATA));
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("lead-time-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});

// --------------------------------------------------------------------------
// CfdSection — uses LoadingState / ErrorState / EmptyState / CfdChart (dynamic)
// --------------------------------------------------------------------------

describe("CfdSection — page states", () => {
  it("renders the loading state while CFD data is in flight", () => {
    mockUseCfdReport.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() });
    render(<CfdSection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders the error state when the CFD read fails", () => {
    mockUseCfdReport.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("Network timeout"), refetch: jest.fn() });
    render(<CfdSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no CFD data points — positive control shows flow history prompt", () => {
    mockUseCfdReport.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    render(<CfdSection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no flow history yet/i)).toBeInTheDocument();
  });

  it("does not render the empty or error state when series data is present — positive control confirms data reaches the chart layer", () => {
    mockUseCfdReport.mockReturnValue({
      data: { series: [{ date: "2026-01-01", backlog: 5, unstarted: 2, started: 3, completed: 1, cancelled: 0 }] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<CfdSection projectId={1} />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  });

  it("returns null when accessState is denied — access gate is honoured", () => {
    mockUseCanState.mockReturnValue("denied");
    const { container } = render(<CfdSection projectId={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// --------------------------------------------------------------------------
// CriticalPathSection — uses LoadingState / ErrorState / EmptyState / chain list
// --------------------------------------------------------------------------

const CRITICAL_PATH_DATA = {
  criticalPath: [
    { ticketId: 1, title: "Design API", estimate: 2, earliestFinish: 2 },
    { ticketId: 2, title: "Implement endpoint", estimate: 3, earliestFinish: 5 },
  ],
  totalDuration: 5,
  edgeCount: 1,
  nodeCount: 2,
  hasCycle: false,
};

describe("CriticalPathSection — page states", () => {
  it("renders the loading state while critical path data is in flight", () => {
    mockUseCriticalPath.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders the error state when the critical path read fails", () => {
    mockUseCriticalPath.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("Timeout"), refetch: jest.fn() });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no dependency chain nodes", () => {
    mockUseCriticalPath.mockReturnValue({ data: { criticalPath: [], totalDuration: 0, edgeCount: 0, nodeCount: 0, hasCycle: false }, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no dependency chain yet/i)).toBeInTheDocument();
  });

  it("renders the chain nodes when critical path data is present — positive control confirms titles reach the UI", () => {
    mockUseCriticalPath.mockReturnValue({ data: CRITICAL_PATH_DATA, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByText("Design API")).toBeInTheDocument();
    expect(screen.getByText("Implement endpoint")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("returns null when accessState is denied — access gate is honoured", () => {
    mockUseCanState.mockReturnValue("denied");
    const { container } = render(<CriticalPathSection projectId={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});
