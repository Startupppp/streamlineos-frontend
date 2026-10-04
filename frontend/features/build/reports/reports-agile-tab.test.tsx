import React from "react";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseVelocityReport = jest.fn();
const mockUseBurnupReport = jest.fn();
const mockUseCycleTimeReport = jest.fn();
const mockUseLeadTimeReport = jest.fn();
const mockUseCfdReport = jest.fn();
const mockUseCriticalPath = jest.fn();
const mockUsePageState = jest.fn();

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

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string; permission?: string | null };
    loading: ReactNode;
    empty?: ReactNode;
    children: ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "denied")
      return (
        <div
          data-testid="no-permission"
          data-permission={resolution.permission ?? ""}
        />
      );
    if (resolution.kind === "error")
      return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <>{empty}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useCanState: jest.fn(() => "granted"),
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
  Layers: () => null,
  Camera: () => null,
}));

import { VelocitySection } from "./velocity-section";
import { BurnupSection } from "./burnup-section";
import { CycleTimeSection } from "./cycle-time-section";
import { LeadTimeSection } from "./lead-time-section";
import { CfdSection } from "./cfd-section";
import { CriticalPathSection } from "./critical-path-section";
import {
  encodeFilterEnvelope as encodeReportFilter,
  decodeFilterEnvelope as decodeReportFilter,
  type FilterEnvelopeV1,
} from "@/lib/filter-envelope/filter-envelope-v1";

function settled<T>(data: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function velocityPage(sprints: typeof VELOCITY_DATA) {
  return { data: sprints, pagination: { limit: 100, hasMore: false, nextCursor: null } };
}

function settledVelocity(sprints: typeof VELOCITY_DATA) {
  return {
    data: { pages: [velocityPage(sprints)], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

function _loading() {
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
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseVelocityReport.mockReturnValue(settledVelocity([]));
  mockUseBurnupReport.mockReturnValue(settled([]));
  mockUseCycleTimeReport.mockReturnValue(settled([]));
  mockUseLeadTimeReport.mockReturnValue(settled([]));
  mockUseCfdReport.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  mockUseCriticalPath.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
});





describe("VelocitySection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("plan required");
    mockUseVelocityReport.mockReturnValue(failed("plan required"));
    render(<VelocitySection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders the loading state while velocity data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.queryByTestId("velocity-chart")).not.toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("timeout") });
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("velocity-chart")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no cycles with velocity data", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("velocity-chart")).not.toBeInTheDocument();
  });

  it("renders the velocity chart when sprint data is present — positive control confirms rows reach the chart", () => {
    mockUseVelocityReport.mockReturnValue(settledVelocity(VELOCITY_DATA));
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("velocity-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});





describe("BurnupSection — page states", () => {
  it("passes build:view permission to usePageState so the denial reason is shown", () => {
    render(<BurnupSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view" }),
    );
  });

  it("renders the loading state while either query is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("timeout") });
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no burnup data points", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("burnup-chart")).not.toBeInTheDocument();
  });

  it("renders the burnup chart when burnup points are present — positive control confirms data reaches the chart", () => {
    mockUseVelocityReport.mockReturnValue(settledVelocity(VELOCITY_DATA));
    mockUseBurnupReport.mockReturnValue(settled(BURNUP_DATA));
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("burnup-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});





describe("CycleTimeSection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("timeout");
    mockUseCycleTimeReport.mockReturnValue(failed("timeout"));
    render(<CycleTimeSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders a skeleton while cycle time data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-time-chart")).not.toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("timeout") });
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-time-chart")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no cycle time points", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
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

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});





describe("LeadTimeSection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("timeout");
    mockUseLeadTimeReport.mockReturnValue(failed("timeout"));
    render(<LeadTimeSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders a skeleton while lead time data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("lead-time-chart")).not.toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("timeout") });
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("lead-time-chart")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no lead time points", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
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

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});







describe("CfdSection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("Network timeout");
    mockUseCfdReport.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: err, refetch: jest.fn() });
    render(<CfdSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders the loading state while CFD data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<CfdSection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("Network timeout") });
    render(<CfdSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no CFD data points — positive control shows flow history prompt", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
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

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<CfdSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});





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

describe("ReportFilterEnvelope — encode/decode round-trip (BT-9ce12613e7f6)", () => {
  it("round-trips an envelope with a single status clause through encode and decode without data loss", () => {
    const envelope = {
      version: 1 as const,
      logic: "and" as const,
      filters: [{ field: "status", op: "is" as const, value: "done" }],
    };
    const encoded = encodeReportFilter(envelope);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
    const decoded = decodeReportFilter(encoded);
    expect(decoded).toEqual(envelope);
  });

  it("round-trips an empty envelope through encode and decode — positive control for zero-clause case", () => {
    const envelope = { version: 1 as const, logic: "and" as const, filters: [] };
    const decoded = decodeReportFilter(encodeReportFilter(envelope));
    expect(decoded).toEqual(envelope);
  });

  it("returns null when decoding a corrupt encoded string — positive control confirms failure is handled", () => {
    expect(decodeReportFilter("not-valid-base64!!")).toBeNull();
  });
});

describe("CriticalPathSection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("Timeout");
    mockUseCriticalPath.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: err, refetch: jest.fn() });
    render(<CriticalPathSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders the loading state while critical path data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("Timeout") });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no dependency chain nodes", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
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

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});

const STATUS_FILTER: FilterEnvelopeV1 = {
  version: 1,
  logic: "and",
  filters: [{ field: "status", op: "is", value: "DONE" }],
};

describe("FilterEnvelope wiring — VelocitySection passes filterEnvelope to useVelocityReport (BT-185db6b8a5ca)", () => {
  it("passes the filterEnvelope to useVelocityReport when provided — positive control confirms wiring", () => {
    render(<VelocitySection projectId={1} filterEnvelope={STATUS_FILTER} />);
    expect(mockUseVelocityReport).toHaveBeenCalledWith(1, STATUS_FILTER);
  });

  it("calls useVelocityReport with only projectId when no filterEnvelope provided — no-filter baseline", () => {
    render(<VelocitySection projectId={1} />);
    expect(mockUseVelocityReport).toHaveBeenCalledWith(1, undefined);
  });
});

describe("FilterEnvelope wiring — BurnupSection passes filterEnvelope to hooks (BT-185db6b8a5ca)", () => {
  it("passes filterEnvelope to useVelocityReport and useBurnupReport when provided — positive control confirms wiring", () => {
    render(<BurnupSection projectId={2} filterEnvelope={STATUS_FILTER} />);
    expect(mockUseVelocityReport).toHaveBeenCalledWith(2, STATUS_FILTER);
    const burnupCall = mockUseBurnupReport.mock.calls.find(
      (args) => args[0] === 2 && args[2] === STATUS_FILTER,
    );
    expect(burnupCall).toBeDefined();
  });
});

describe("CfdSection — snapshots are project-wide, so active filters are disclosed, never sent", () => {
  it("tells the reader filters do not apply and still requests the unfiltered report", () => {
    render(<CfdSection projectId={3} filtersActive />);
    expect(mockUseCfdReport).toHaveBeenCalledWith(3, expect.any(Number));
    expect(screen.getByText(/Filters do not apply to this chart/)).toBeInTheDocument();
  });

  it("shows no filter note when no filter is active", () => {
    render(<CfdSection projectId={3} />);
    expect(screen.queryByText(/Filters do not apply to this chart/)).not.toBeInTheDocument();
  });
});
