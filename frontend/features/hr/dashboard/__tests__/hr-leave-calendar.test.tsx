import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders, expectNoAxeViolations, atViewport } from "@/test-utils";
import { HrLeaveCalendar } from "../hr-leave-calendar";

jest.mock("@/hooks/api/hr/dashboard", () => ({
  useHrLeaveCalendar: jest.fn(),
}));

jest.mock("@/features/hr/shared/hr-ui", () => ({
  HrStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

type LeaveEntry = {
  id: number;
  userName: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
};

type UseHrLeaveCalendarReturn = {
  data: LeaveEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: jest.Mock;
};

const { useHrLeaveCalendar } = jest.requireMock("@/hooks/api/hr/dashboard") as {
  useHrLeaveCalendar: jest.MockedFunction<(month: number, year: number) => UseHrLeaveCalendarReturn>;
};

const LEAVE_ENTRIES: LeaveEntry[] = [
  {
    id: 1,
    userName: "Alice Sharma",
    startDate: "2026-09-05",
    endDate: "2026-09-07",
    leaveType: "Annual Leave",
    status: "approved",
  },
  {
    id: 2,
    userName: "Bob Patel",
    startDate: "2026-09-10",
    endDate: "2026-09-10",
    leaveType: "Sick Leave",
    status: "pending",
  },
];

const DEFAULT_RETURN: UseHrLeaveCalendarReturn = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN });
});

afterEach(() => jest.clearAllMocks());

describe("HrLeaveCalendar", () => {
  it("shows loading skeleton while fetching", () => {
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, isLoading: true });
    renderWithProviders(<HrLeaveCalendar />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows empty state when data is empty array", () => {
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: [] });
    renderWithProviders(<HrLeaveCalendar />);
    expect(screen.getByText("No leaves this month")).toBeInTheDocument();
  });

  it("shows error state when query fails", () => {
    useHrLeaveCalendar.mockReturnValue({
      ...DEFAULT_RETURN,
      isError: true,
      error: new Error("Network error"),
    });
    renderWithProviders(<HrLeaveCalendar />);
    expect(screen.getByText("Couldn't load leave calendar")).toBeInTheDocument();
  });

  it("renders leave entries when data is present", () => {
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: LEAVE_ENTRIES });
    renderWithProviders(<HrLeaveCalendar />);
    expect(screen.getByText("Alice Sharma")).toBeInTheDocument();
    expect(screen.getByText("Bob Patel")).toBeInTheDocument();
    expect(screen.getAllByTestId("status-badge")).toHaveLength(2);
  });

  it("shows badge with leave count when data is present", () => {
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: LEAVE_ENTRIES });
    renderWithProviders(<HrLeaveCalendar />);
    expect(screen.getByText("2 leaves")).toBeInTheDocument();
  });

  it("navigates to previous month on prev button click", () => {
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: [] });
    renderWithProviders(<HrLeaveCalendar />);
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(useHrLeaveCalendar).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
  });

  it("navigates to next month on next button click", () => {
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: [] });
    renderWithProviders(<HrLeaveCalendar />);
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(useHrLeaveCalendar).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
  });

  it("has no axe violations with data", async () => {
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: LEAVE_ENTRIES });
    const { container } = renderWithProviders(<HrLeaveCalendar />);
    await expectNoAxeViolations(container);
  });

  it("has no axe violations on empty state", async () => {
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: [] });
    const { container } = renderWithProviders(<HrLeaveCalendar />);
    await expectNoAxeViolations(container);
  });

  it("renders at mobile viewport (375px)", () => {
    const restore = atViewport("mobile");
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: LEAVE_ENTRIES });
    renderWithProviders(<HrLeaveCalendar />);
    expect(screen.getByText("Alice Sharma")).toBeInTheDocument();
    restore();
  });

  it("renders leave type in the entry", () => {
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: LEAVE_ENTRIES });
    renderWithProviders(<HrLeaveCalendar />);
    expect(screen.getByText(/Annual Leave/)).toBeInTheDocument();
    expect(screen.getByText(/Sick Leave/)).toBeInTheDocument();
  });

  it("shows single-day leave without a dash", () => {
    const singleDay: LeaveEntry[] = [
      { id: 3, userName: "Carol", startDate: "2026-09-15", endDate: "2026-09-15", leaveType: "Annual Leave", status: "approved" },
    ];
    useHrLeaveCalendar.mockReturnValue({ ...DEFAULT_RETURN, data: singleDay });
    renderWithProviders(<HrLeaveCalendar />);
    expect(screen.queryByText("–")).not.toBeInTheDocument();
  });
});
