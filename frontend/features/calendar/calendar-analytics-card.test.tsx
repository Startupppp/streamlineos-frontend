import { render, screen } from "@testing-library/react";
import { CalendarAnalyticsCard } from "./calendar-analytics-card";

const mockUseCalendarAnalytics = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/calendar/settings",
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("analyticsMonth=2026-09"),
}));

jest.mock("@/hooks/api/calendar-admin", () => ({
  useCalendarAnalytics: (from: string, to: string) => mockUseCalendarAnalytics(from, to),
}));

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00.000Z"));
  mockUseCalendarAnalytics.mockReset().mockReturnValue({ isLoading: false, isError: false, isFetching: false, data: null });
});

afterEach(() => jest.useRealTimers());

it("requests exactly the selected month in the organization's timezone", () => {
  render(<CalendarAnalyticsCard timeZone="Asia/Calcutta" retentionDays={365} />);
  expect(mockUseCalendarAnalytics).toHaveBeenCalledWith("2026-09-01", "2026-10-01");
  expect(screen.getByRole("combobox", { name: "Month" })).toBeInTheDocument();
  expect(screen.queryByText("Through")).not.toBeInTheDocument();
});

it("withholds metrics and source details for a partially retained month", () => {
  mockUseCalendarAnalytics.mockReturnValue({
    isLoading: false,
    isError: false,
    isFetching: false,
    data: {
      period: { retentionApplied: true, timeZone: "Asia/Calcutta" },
      coverage: { state: "complete", expectedSources: [], observedSources: [], missingSources: [], partialSources: [], failedSources: [] },
      privacy: { minimumCohort: 5, suppressed: false },
      metrics: [{ key: "bookings", label: "Bookings", value: 0, unit: "count", numerator: 0, denominator: 0, definition: "Test" }],
    },
  });
  render(<CalendarAnalyticsCard timeZone="Asia/Calcutta" retentionDays={365} />);
  expect(screen.getByText("Month withheld by retention")).toBeInTheDocument();
  expect(screen.queryByText("Bookings")).not.toBeInTheDocument();
  expect(screen.queryByText("Source coverage")).not.toBeInTheDocument();
});
