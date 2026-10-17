import { render, screen } from "@testing-library/react";
import { LeaveBalanceWidget } from "./hr-widgets";

jest.mock("@/hooks/api/dashboard", () => ({
  useMyLeaveBalance: jest.fn().mockReturnValue({
    data: [
      {
        id: 1,
        balance: "8.00",
        year: 2026,
        leaveTypeName: "Annual Leave",
        daysPerYear: 20,
      },
      {
        id: 2,
        balance: "3.00",
        year: 2026,
        leaveTypeName: "Sick Leave",
        daysPerYear: 10,
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useBirthdays: jest.fn().mockReturnValue({ data: [], isLoading: false }),
  useLeavesToday: jest.fn().mockReturnValue({ data: undefined, isLoading: false }),
  usePendingApprovals: jest.fn().mockReturnValue({ data: undefined, isLoading: false }),
  useUpcomingHolidays: jest.fn().mockReturnValue({ data: [], isLoading: false }),
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrMyLeaveRequests: jest.fn().mockReturnValue({
    data: { requests: [] },
    isLoading: false,
  }),
}));

jest.mock("@/features/dashboard/use-dashboard-access", () => ({
  useDashboardAccess: jest.fn().mockReturnValue({
    canApproveLeaves: false,
    hrEnabled: true,
  }),
}));

describe("LeaveBalanceWidget — uses StatCard/StatCardGrid primitives per FE-106", () => {
  it("renders leave balance items inside a StatCardGrid so they align with the rest of the stat grid", () => {
    render(<LeaveBalanceWidget />);
    expect(document.querySelector("[data-slot='stat-card-grid']")).toBeInTheDocument();
  });

  it("renders each leave type as a StatCard with the balance as the value", () => {
    render(<LeaveBalanceWidget />);
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
    expect(screen.getByText("Sick Leave")).toBeInTheDocument();
  });
});
