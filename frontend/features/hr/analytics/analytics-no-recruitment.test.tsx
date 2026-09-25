import { render, screen } from "@testing-library/react";
import { AnalyticsPageClient } from "./analytics-page-client";

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/hooks/api/hr/analytics", () => ({
  useHrAnalytics: () => ({
    data: { headcount: { active: 12 }, attendance: { totalLogsThisMonth: 40 } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useHrAttritionAnalytics: () => ({ data: { attritionRatePercent: "1.5" }, isLoading: false }),
}));

jest.mock("@/features/hr/analytics/workforce-section", () => ({ WorkforceSection: () => null }));
jest.mock("@/features/hr/analytics/attendance-section", () => ({ AttendanceSection: () => null }));
jest.mock("@/features/hr/analytics/leave-section", () => ({ LeaveSection: () => null }));
jest.mock("@/features/hr/analytics/attrition-section", () => ({ AttritionSection: () => null }));
jest.mock("@/features/hr/analytics/command-center-section", () => ({ CommandCenterSection: () => null }));

// Recruitment analytics live in Recruitment OS (/recruitment/analytics), never in HRMS.
describe("people analytics carries no recruitment", () => {
  it("offers no Recruitment tab and no open-positions figure", () => {
    render(<AnalyticsPageClient />);
    expect(screen.queryByRole("tab", { name: "Recruitment" })).not.toBeInTheDocument();
    expect(screen.queryByText("Open positions")).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });
});
