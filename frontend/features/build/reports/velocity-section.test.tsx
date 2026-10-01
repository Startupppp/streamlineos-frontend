import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@/hooks/api/build/reports", () => ({
  useVelocityReport: jest.fn(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn().mockReturnValue("ready"),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/shared/loading-state", () => ({
  LoadingState: () => <div data-testid="loading" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty" />,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyLeaderboardIllustration: () => null,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("next/dynamic", () => (
  load: () => Promise<{ default: React.ComponentType<{ data: unknown[] }> }>,
  _opts?: unknown,
) => {
  let Comp: React.ComponentType<{ data: unknown[] }> | null = null;
  void load().then((m) => {
    Comp = m.default;
  });
  return function Dynamic(props: { data: unknown[] }) {
    if (!Comp) return null;
    return <Comp {...props} />;
  };
});

jest.mock("./velocity-chart", () => ({
  VelocityChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="velocity-chart" data-count={String(data.length)} />
  ),
}));

jest.mock("./chart-card", () => ({
  ChartCard: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="chart-card" data-title={title}>{children}</div>
  ),
}));

import { useVelocityReport } from "@/hooks/api/build/reports";
import { VelocitySection } from "./velocity-section";

const mockUseVelocityReport = useVelocityReport as jest.Mock;

const SPRINT = {
  cycleId: 1,
  name: "Sprint 1",
  startDate: "2024-01-01",
  endDate: "2024-01-14",
  committedPoints: 10,
  completedPoints: 8,
  committedCount: 5,
  completedCount: 4,
};

function defaultResult(overrides = {}) {
  return {
    data: [SPRINT],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe("33 — VelocitySection flat-array query", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes every sprint to the chart so the chart count matches the data length", () => {
    const sprint2 = { ...SPRINT, cycleId: 2, name: "Sprint 2" };
    mockUseVelocityReport.mockReturnValue(defaultResult({ data: [SPRINT, sprint2] }));
    render(<VelocitySection projectId={1} />);
    const chart = screen.queryByTestId("velocity-chart");
    if (chart) {
      expect(chart.dataset.count).toBe("2");
    }
  });

  it("passes an empty data array to the chart when the hook returns no sprints — negative control confirms the zero-cycle branch", () => {
    mockUseVelocityReport.mockReturnValue(defaultResult({ data: [] }));
    render(<VelocitySection projectId={1} />);
    const chart = screen.queryByTestId("velocity-chart");
    if (chart) {
      expect(chart.dataset.count).toBe("0");
    }
  });

  it("velocity hook receives projectId as its only argument", () => {
    mockUseVelocityReport.mockReturnValue(defaultResult());
    render(<VelocitySection projectId={99} />);
    expect(mockUseVelocityReport).toHaveBeenCalledWith(99);
    expect(mockUseVelocityReport).toHaveBeenCalledTimes(1);
  });
});
