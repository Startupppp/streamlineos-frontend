import { render, screen } from "@testing-library/react";
import { CalendarAnalyticsCard } from "./calendar-analytics-card";

const mockUseCalendarAnalytics = jest.fn();
let mockSearchParams = new URLSearchParams("analyticsMonth=2026-09");

jest.mock("next/navigation", () => ({
  usePathname: () => "/calendar/settings",
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/calendar-admin", () => ({
  useCalendarAnalytics: (from: string, to: string) => mockUseCalendarAnalytics(from, to),
}));

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00.000Z"));
  mockSearchParams = new URLSearchParams("analyticsMonth=2026-09");
  mockUseCalendarAnalytics.mockReset().mockReturnValue({ isLoading: false, isError: false, isFetching: false, data: null });
});

afterEach(() => jest.useRealTimers());

it("requests exactly the selected month in the organization's timezone", () => {
  render(<CalendarAnalyticsCard timeZone="Asia/Calcutta" retentionDays={365} />);
  expect(mockUseCalendarAnalytics).toHaveBeenCalledWith("2026-09-01", "2026-10-01");
  expect(screen.getByRole("combobox", { name: "Month" })).toBeInTheDocument();
  expect(screen.queryByText("Through")).not.toBeInTheDocument();
});

it("defaults to the newest released complete month when no month was selected", () => {
  mockSearchParams = new URLSearchParams();
  render(<CalendarAnalyticsCard timeZone="Asia/Calcutta" retentionDays={365} />);
  expect(mockUseCalendarAnalytics).toHaveBeenCalledWith("2026-09-01", "2026-10-01");
});

it("defaults to a pending month when retention excludes every released complete month", () => {
  mockSearchParams = new URLSearchParams();
  render(<CalendarAnalyticsCard timeZone="Asia/Calcutta" retentionDays={30} />);
  expect(mockUseCalendarAnalytics).toHaveBeenCalledWith("2026-10-01", "2026-11-01");
});

it("withholds metrics and source details for a partially retained month", () => {
  mockUseCalendarAnalytics.mockReturnValue({
    isLoading: false,
    isError: false,
    isFetching: false,
    data: {
      period: { retentionApplied: true, availableAt: "2026-10-08T00:00:00.000Z", timeZone: "Asia/Calcutta" },
      coverage: { state: "complete", expectedSources: [], observedSources: [], missingSources: [], partialSources: [], failedSources: [] },
      privacy: { minimumCohort: 5, cohortState: "retention_withheld", suppressed: true },
      metrics: [{ key: "bookings", label: "Bookings", value: null, unit: "count", numerator: null, denominator: null, definition: "Test", suppressed: true }],
    },
  });
  render(<CalendarAnalyticsCard timeZone="Asia/Calcutta" retentionDays={365} />);
  expect(screen.getByText("Month withheld by retention")).toBeInTheDocument();
  expect(screen.getByText(/Part of this month falls outside the retained analytics window/)).toBeInTheDocument();
  expect(screen.queryByText("Bookings")).not.toBeInTheDocument();
  expect(screen.queryByText("Source coverage")).not.toBeInTheDocument();
  expect(screen.queryByText("Small cohort protected")).not.toBeInTheDocument();
});

it("shows the pending release date without exposing suppressed metrics", () => {
  mockUseCalendarAnalytics.mockReturnValue({
    isLoading: false,
    isError: false,
    isFetching: false,
    data: {
      period: { retentionApplied: false, availableAt: "2026-10-23T00:00:00.000Z", timeZone: "Asia/Calcutta" },
      coverage: { state: "complete", expectedSources: [], observedSources: [], missingSources: [], partialSources: [], failedSources: [] },
      privacy: { minimumCohort: 5, cohortState: "pending", suppressed: true },
      metrics: [{ key: "bookings", label: "Bookings", value: null, unit: "count", numerator: null, denominator: null, definition: "Test", suppressed: true }],
    },
  });
  render(<CalendarAnalyticsCard timeZone="Asia/Calcutta" retentionDays={365} />);
  expect(screen.getByText("Monthly report pending")).toBeInTheDocument();
  expect(screen.getByText(/23 Oct 2026/)).toBeInTheDocument();
  expect(screen.queryByText("Bookings")).not.toBeInTheDocument();
  expect(screen.queryByText("Source coverage")).not.toBeInTheDocument();
  expect(screen.queryByText("Small cohort protected")).not.toBeInTheDocument();
});

it("distinguishes a zero-denominator metric from a privacy-suppressed metric", () => {
  mockUseCalendarAnalytics.mockReturnValue({
    isLoading: false,
    isError: false,
    isFetching: false,
    data: {
      period: { retentionApplied: false, availableAt: "2026-10-08T00:00:00.000Z", timeZone: "Asia/Calcutta" },
      coverage: { state: "complete", expectedSources: [], observedSources: [], missingSources: [], partialSources: [], failedSources: [] },
      privacy: { minimumCohort: 5, cohortState: "sufficient", suppressed: false },
      metrics: [
        { key: "fallback", label: "Routing fallback rate", value: null, unit: "percent", numerator: 0, denominator: 0, definition: "Test", suppressed: false },
        { key: "private", label: "Private metric", value: null, unit: "count", numerator: null, denominator: null, definition: "Test", suppressed: true },
      ],
      freshness: { latestEventAt: null, correctionEvents: 0, lateEvents: 0 },
      methodology: { basis: "Test", denominator: "Test", deduplication: "Test", corrections: "Test", deletedRecords: "Test", lateEventDefinition: "Test" },
    },
  });
  render(<CalendarAnalyticsCard timeZone="Asia/Calcutta" retentionDays={365} />);
  expect(screen.getByText("No data")).toBeInTheDocument();
  expect(screen.getByText("Suppressed")).toBeInTheDocument();
  expect(screen.getByText("0 of 0")).toBeInTheDocument();
});
