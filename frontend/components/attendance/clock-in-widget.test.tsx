import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClockInWidget } from "./clock-in-widget";

const statusQuery = { data: undefined as unknown, isLoading: true };
const checkIn = { mutate: jest.fn(), isPending: false };
const checkOut = { mutate: jest.fn(), isPending: false };

jest.mock("@/hooks/api", () => ({
  useHrAttendanceStatus: () => statusQuery,
  useHrCheckIn: () => checkIn,
  useHrCheckOut: () => checkOut,
}));
jest.mock("@/hooks/api/org-display", () => ({ useOrgTimeZone: () => "Asia/Kolkata" }));

describe("ClockInWidget — RBAC-UX-r1-11 no alarming control while the status loads", () => {
  beforeEach(() => {
    checkIn.mutate.mockReset();
    checkOut.mutate.mockReset();
    checkIn.isPending = false;
    checkOut.isPending = false;
  });

  it("renders the layout-matching skeleton, not a red spinner button, while the attendance status is unknown", () => {
    statusQuery.isLoading = true;
    statusQuery.data = undefined;

    render(<ClockInWidget />);

    expect(screen.getByTestId("clock-in-widget-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByTitle("Your location is recorded when you clock in."),
    ).not.toBeInTheDocument();
  });

  it("offers a single clock-in primary action once the status is known, with the location notice on the control", () => {
    statusQuery.isLoading = false;
    statusQuery.data = { status: "ABSENT", cooldownRemaining: 0, todayLog: null, dailyStats: null };

    render(<ClockInWidget />);

    const button = screen.getByRole("button", { name: "Web clock in" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute(
      "title",
      "Your location is recorded when you clock in.",
    );
    expect(button.className).not.toMatch(/(^|\s)bg-(destructive|status-danger)/);
    expect(button.className).toMatch(/(^|\s)bg-primary(\s|$)/);
    expect(screen.queryByRole("button", { name: "Web clock out" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("clock-in-widget-skeleton")).not.toBeInTheDocument();
  });

  it("switches the same button to clock-out once the person is checked in", async () => {
    const user = userEvent.setup();
    statusQuery.isLoading = false;
    statusQuery.data = {
      status: "PRESENT",
      cooldownRemaining: 0,
      todayLog: { checkIn: "2026-10-22T09:00:00.000Z", checkOut: null },
      dailyStats: null,
    };

    render(<ClockInWidget />);

    const button = screen.getByRole("button", { name: "Web clock out" });
    expect(button).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Web clock in" })).not.toBeInTheDocument();
    await user.click(button);
    expect(checkOut.mutate).toHaveBeenCalledTimes(1);
  });
});
