import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import type { ProjectAnalytics } from "@/types/projects";
import { AnalyticsKpiStrip } from "./analytics-kpi-strip";

jest.mock("@/components/ui/stat-card", () => ({
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => null,
  StatCard: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid={`kpi-${label}`}>{value}</div>
  ),
}));

const BASE: ProjectAnalytics = {
  stateDistribution: [
    { status: "In review", count: 4 },
    { status: "Shipped", count: 6 },
  ],
  priorityBreakdown: [],
  assigneeCompletion: [],
  volumeOverTime: [],
  cycleVelocity: [],
  estimateVsActual: [],
};

describe("AnalyticsKpiStrip open count", () => {
  it("uses the server's status-group open count so custom done statuses are not counted as open", () => {
    render(
      <AnalyticsKpiStrip
        analytics={{
          ...BASE,
          healthBreakdown: {
            completionPct: 60, onTimePct: 100, velocityScore: 0,
            overdueTickets: 0, totalTickets: 10, openTickets: 4,
          },
        }}
      />,
    );
    expect(screen.getByTestId("kpi-Open")).toHaveTextContent("4");
  });

  it("falls back to status names when the server sends no breakdown — paired with the breakdown test", () => {
    render(<AnalyticsKpiStrip analytics={BASE} />);
    expect(screen.getByTestId("kpi-Open")).toHaveTextContent("10");
  });
});
