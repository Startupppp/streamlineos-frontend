import { render, screen } from "@testing-library/react";
import { MyAttendancePage } from "./my-attendance-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/me/attendance",
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/hooks/api/hr/use-url-tab", () => ({
  useUrlTab: () => ({ activeTab: "today", onTabChange: jest.fn() }),
}));

jest.mock("@/features/hr/attendance/check-in-button", () => ({
  TimerCard: () => null,
}));
jest.mock("@/features/hr/attendance/daily-history-table", () => ({
  DailyHistoryTable: () => null,
}));
jest.mock("@/features/hr/attendance/attendance-regularization-dialog", () => ({
  AttendanceRegularizationDialog: () => null,
}));
jest.mock("@/features/hr/attendance/attendance-email-dialog", () => ({
  AttendanceEmailDialog: () => null,
}));

describe("my attendance header actions keep an accessible name when their label is hidden", () => {
  it("Open Calendar is announced", () => {
    render(<MyAttendancePage />);

    const controls = screen.getAllByRole("link", { name: "Open Calendar" });

    expect(
      controls.some(
        (control) => control.getAttribute("aria-label") === "Open Calendar",
      ),
    ).toBe(true);
  });
});
