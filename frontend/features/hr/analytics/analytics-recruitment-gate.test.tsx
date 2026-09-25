import { render, screen } from "@testing-library/react";
import { AnalyticsPageClient } from "./analytics-page-client";

const mockUseCan = jest.fn<boolean, [string]>();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

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

jest.mock("@/hooks/api/hr/recruitment", () => ({
  useRecruitmentStats: () => ({ data: { openJobs: 3 }, isLoading: false }),
}));

jest.mock("@/features/hr/analytics/workforce-section", () => ({ WorkforceSection: () => null }));
jest.mock("@/features/hr/analytics/recruitment-section", () => ({ RecruitmentSection: () => null }));
jest.mock("@/features/hr/analytics/attendance-section", () => ({ AttendanceSection: () => null }));
jest.mock("@/features/hr/analytics/leave-section", () => ({ LeaveSection: () => null }));
jest.mock("@/features/hr/analytics/attrition-section", () => ({ AttritionSection: () => null }));
jest.mock("@/features/hr/analytics/command-center-section", () => ({ CommandCenterSection: () => null }));

describe("people analytics without recruitment access", () => {
  it("offers the Recruitment tab and the open-positions figure only to a viewer who can read hiring data", () => {
    mockUseCan.mockReturnValue(true);
    const { unmount } = render(<AnalyticsPageClient />);
    expect(screen.getByRole("tab", { name: "Recruitment" })).toBeInTheDocument();
    expect(screen.getByText("Open positions")).toBeInTheDocument();
    unmount();

    mockUseCan.mockReturnValue(false);
    render(<AnalyticsPageClient />);
    expect(screen.queryByRole("tab", { name: "Recruitment" })).not.toBeInTheDocument();
    expect(screen.queryByText("Open positions")).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });
});
