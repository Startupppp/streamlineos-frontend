import { render, screen } from "@testing-library/react";
import { ClockInWidget } from "./clock-in-widget";

const statusQuery = { data: undefined as unknown, isLoading: true };
const checkIn = { mutate: jest.fn(), isPending: false };

jest.mock("@/hooks/api", () => ({
  useHrAttendanceStatus: () => statusQuery,
  useHrCheckIn: () => checkIn,
  useHrCheckOut: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/org-display", () => ({ useOrgTimeZone: () => "Asia/Kolkata" }));

describe("ClockInWidget — RBAC-UX-r1-11 no alarming control while the status loads", () => {
  it("renders the layout-matching skeleton, not a red spinner button, while the attendance status is unknown", () => {
    statusQuery.isLoading = true;
    statusQuery.data = undefined;

    render(<ClockInWidget />);

    expect(screen.getByTestId("clock-in-widget-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Your location is recorded when you clock in.")).not.toBeInTheDocument();
  });

  it("offers clock-in as an ordinary primary action once the status is known, with the location notice beside it", () => {
    statusQuery.isLoading = false;
    statusQuery.data = { status: "ABSENT", cooldownRemaining: 0, todayLog: null, dailyStats: null };

    render(<ClockInWidget />);

    const button = screen.getByRole("button", { name: "WEB CLOCK-IN" });
    expect(button).toBeEnabled();
    expect(button.className).not.toMatch(/(^|\s)bg-(destructive|status-danger)/);
    expect(button.className).toMatch(/(^|\s)bg-primary(\s|$)/);
    expect(screen.getByText("Your location is recorded when you clock in.")).toBeInTheDocument();
    expect(screen.queryByTestId("clock-in-widget-skeleton")).not.toBeInTheDocument();
  });
});
