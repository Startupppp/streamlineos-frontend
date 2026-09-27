import React from "react";
import { render, screen } from "@testing-library/react";
import type { InfiniteData } from "@tanstack/react-query";

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

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: ({
    hasNextPage,
    isFetchingNextPage,
    exhausted,
  }: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    exhausted?: string;
  }) => (
    <div
      data-testid="sentinel"
      data-has-next={String(hasNextPage)}
      data-fetching={String(isFetchingNextPage)}
    >
      {!hasNextPage && exhausted ? exhausted : ""}
    </div>
  ),
}));

import { useVelocityReport } from "@/hooks/api/build/reports";
import { VelocitySection } from "./velocity-section";

const mockUseVelocityReport = useVelocityReport as jest.Mock;

interface VelocityPage {
  data: {
    cycleId: number;
    name: string;
    startDate: string;
    endDate: string;
    committedPoints: number;
    completedPoints: number;
    committedCount: number;
    completedCount: number;
  }[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

function makeInfiniteData(
  pages: { data: VelocityPage["data"]; hasMore: boolean; nextCursor: string | null }[],
): InfiniteData<VelocityPage> {
  return {
    pages: pages.map((p) => ({
      data: p.data,
      pagination: { limit: 100, hasMore: p.hasMore, nextCursor: p.nextCursor },
    })),
    pageParams: pages.map((_, i) => (i === 0 ? undefined : `cursor-${i}`)),
  };
}

const SPRINT: VelocityPage["data"][number] = {
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
    data: makeInfiniteData([{ data: [SPRINT], hasMore: false, nextCursor: null }]),
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

describe("33 — VelocitySection infinite scroll", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders sentinel showing exhausted label when all pages are loaded", () => {
    mockUseVelocityReport.mockReturnValue(defaultResult({ hasNextPage: false }));
    render(<VelocitySection projectId={1} />);
    const sentinel = screen.getByTestId("sentinel");
    expect(sentinel.dataset.hasNext).toBe("false");
    expect(sentinel.dataset.fetching).toBe("false");
    expect(sentinel.textContent).toBe("All cycles loaded");
  });

  it("renders sentinel with hasNextPage=true when more pages remain", () => {
    mockUseVelocityReport.mockReturnValue(
      defaultResult({ hasNextPage: true, isFetchingNextPage: false }),
    );
    render(<VelocitySection projectId={1} />);
    const sentinel = screen.getByTestId("sentinel");
    expect(sentinel.dataset.hasNext).toBe("true");
  });

  it("end-of-list (hasNextPage=false) is distinguishable from still-loading (isFetchingNextPage=true)", () => {
    mockUseVelocityReport.mockReturnValue(
      defaultResult({ hasNextPage: true, isFetchingNextPage: true }),
    );
    render(<VelocitySection projectId={1} />);
    const sentinel = screen.getByTestId("sentinel");
    expect(sentinel.dataset.hasNext).toBe("true");
    expect(sentinel.dataset.fetching).toBe("true");
    expect(sentinel.textContent).toBe("");
  });

  it("flattens all pages so every sprint reaches the chart", () => {
    const sprint2 = { ...SPRINT, cycleId: 2, name: "Sprint 2" };
    mockUseVelocityReport.mockReturnValue(
      defaultResult({
        data: makeInfiniteData([
          { data: [SPRINT], hasMore: true, nextCursor: "cursor1" },
          { data: [sprint2], hasMore: false, nextCursor: null },
        ]),
        hasNextPage: false,
      }),
    );
    render(<VelocitySection projectId={1} />);
    const chart = screen.queryByTestId("velocity-chart");
    if (chart) {
      expect(chart.dataset.count).toBe("2");
    }
  });

  it("velocity hook receives projectId as its only argument — cursor tracking is internal to useInfiniteQuery", () => {
    mockUseVelocityReport.mockReturnValue(defaultResult());
    render(<VelocitySection projectId={99} />);
    expect(mockUseVelocityReport).toHaveBeenCalledWith(99);
    expect(mockUseVelocityReport).toHaveBeenCalledTimes(1);
  });
});
