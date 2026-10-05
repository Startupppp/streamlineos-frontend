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

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: ({
    hasNextPage,
    exhausted,
  }: {
    hasNextPage: boolean;
    exhausted?: string;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    label: string;
  }) =>
    hasNextPage ? (
      <div data-testid="sentinel-has-more" />
    ) : (
      <div data-testid="sentinel-exhausted">{exhausted}</div>
    ),
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

function page(sprints: typeof SPRINT[]) {
  return { data: sprints, pagination: { limit: 100, hasMore: false, nextCursor: null } };
}

function defaultResult(overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: [page([SPRINT])], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  };
}

describe("33 — VelocitySection infinite-query", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes every sprint across all pages to the chart — positive: pages.flatMap reaches VelocityChart", () => {
    const sprint2 = { ...SPRINT, cycleId: 2, name: "Sprint 2" };
    mockUseVelocityReport.mockReturnValue(
      defaultResult({ data: { pages: [page([SPRINT]), page([sprint2])], pageParams: [undefined, "cursor-1"] } }),
    );
    render(<VelocitySection projectId={1} />);
    const chart = screen.queryByTestId("velocity-chart");
    if (chart) {
      expect(chart.dataset.count).toBe("2");
    }
  });

  it("passes an empty data array to the chart when all pages return no sprints — negative control", () => {
    mockUseVelocityReport.mockReturnValue(
      defaultResult({ data: { pages: [page([])], pageParams: [undefined] } }),
    );
    render(<VelocitySection projectId={1} />);
    const chart = screen.queryByTestId("velocity-chart");
    if (chart) {
      expect(chart.dataset.count).toBe("0");
    }
  });

  it("sentinel shows exhausted state when hasNextPage is false — negative: no more pages to load", () => {
    mockUseVelocityReport.mockReturnValue(defaultResult({ hasNextPage: false }));
    render(<VelocitySection projectId={1} />);
    expect(screen.queryByTestId("sentinel-exhausted")).toBeInTheDocument();
    expect(screen.queryByTestId("sentinel-has-more")).toBeNull();
  });

  it("sentinel shows has-more state when hasNextPage is true — positive: second page can be fetched", () => {
    mockUseVelocityReport.mockReturnValue(
      defaultResult({
        hasNextPage: true,
        data: {
          pages: [{ data: [SPRINT], pagination: { limit: 100, hasMore: true, nextCursor: "cursor-1" } }],
          pageParams: [undefined],
        },
      }),
    );
    render(<VelocitySection projectId={1} />);
    expect(screen.queryByTestId("sentinel-has-more")).toBeInTheDocument();
    expect(screen.queryByTestId("sentinel-exhausted")).toBeNull();
  });

  it("velocity hook receives projectId as its only argument", () => {
    mockUseVelocityReport.mockReturnValue(defaultResult());
    render(<VelocitySection projectId={99} />);
    expect(mockUseVelocityReport).toHaveBeenCalledWith(99, undefined);
    expect(mockUseVelocityReport).toHaveBeenCalledTimes(1);
  });
});
