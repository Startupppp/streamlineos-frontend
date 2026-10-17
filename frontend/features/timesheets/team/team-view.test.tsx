/**
 * QA-FE-003, FE-TS-007 and FE-TS-008 — the Team page's three honesty defects.
 *
 * QA-FE-003: the live page rendered "Team Time Error: Failed to load team time
 * data", which is the route's error.tsx, not the ErrorState this view already
 * draws. Both of its reads threw to the boundary, so the in-page retry was
 * unreachable and a failure of the billable-percentage satellite took the whole
 * route with it. The reads are inline now; the assertion here is that a failed
 * summary stays inside the page.
 *
 * FE-TS-007: the week was pinned to Monday regardless of the org's work week.
 * FE-TS-008: billable % was computed as 0 when the reports read was refused.
 */
import { render, screen } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import { useTeamWeekSummary } from "@/hooks/api/timesheets-core/team";
import { useReportsOverview } from "@/hooks/api/timesheets-core/reports";
import { useTimesheetSettings } from "@/hooks/api/timesheets-core/settings";
import { TeamView } from "./team-view";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useScope: () => "all",
  useAccess: () => ({ data: { isOrgOwner: true, scopes: {} } }),
  usePermissionGate: () => ({ allowed: true, denied: false, pending: false, unavailable: false }),
}));
jest.mock("@/hooks/api/timesheets-core/team", () => ({ useTeamWeekSummary: jest.fn() }));
jest.mock("@/hooks/api/timesheets-core/reports", () => ({ useReportsOverview: jest.fn() }));
jest.mock("@/hooks/api/timesheets-core/settings", () => ({ useTimesheetSettings: jest.fn() }));
jest.mock("./member-detail-sheet", () => ({ MemberDetailSheet: () => null }));
jest.mock("./team-table", () => ({ TeamTable: () => <div data-testid="team-table" /> }));

const can = useCan as unknown as jest.Mock;
const summary = useTeamWeekSummary as unknown as jest.Mock;
const overview = useReportsOverview as unknown as jest.Mock;
const settings = useTimesheetSettings as unknown as jest.Mock;

const SUMMARY_OK = {
  data: { summaries: [] },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-09-30T12:00:00Z")); // a Wednesday
  can.mockReturnValue(true);
  summary.mockReturnValue(SUMMARY_OK);
  overview.mockReturnValue({ data: undefined, isLoading: false });
  settings.mockReturnValue({ data: undefined });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("QA-FE-003 — a failed team read stays on the page", () => {
  it("renders the in-page ErrorState with a retry rather than throwing", () => {
    summary.mockReturnValue({ ...SUMMARY_OK, data: undefined, isError: true });

    expect(() => render(<TeamView />)).not.toThrow();
    expect(screen.getByText("Couldn't load team timesheets")).toBeInTheDocument();
    expect(screen.queryByTestId("team-table")).not.toBeInTheDocument();
  });
});

describe("FE-TS-007 — week bounds follow the org work week", () => {
  it("uses Monday when the org has no setting", () => {
    render(<TeamView />);
    expect(summary).toHaveBeenCalledWith([], "2026-09-28", "2026-10-04", true);
  });

  it("uses the org's configured work week start", () => {
    settings.mockReturnValue({ data: { workWeekStart: 0 } }); // Sunday
    render(<TeamView />);
    expect(summary).toHaveBeenCalledWith([], "2026-09-27", "2026-10-03", true);
  });
});

describe("FE-TS-008 — billable % is not invented", () => {
  it("does not ask for the reports overview without reports:view", () => {
    can.mockImplementation((key: string) => key !== "timesheets:reports:view");
    render(<TeamView />);
    expect(overview).toHaveBeenCalledWith(
      { startDate: "2026-09-28", endDate: "2026-10-04" },
      false,
    );
    expect(screen.getByText("Billable").closest("div")).toHaveTextContent("—");
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("shows the percentage when the overview is available", () => {
    overview.mockReturnValue({
      data: { totalHours: 40, billableHours: 30 },
      isLoading: false,
    });
    render(<TeamView />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});
