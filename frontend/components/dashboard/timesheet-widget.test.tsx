import { render, screen } from "@testing-library/react";

const personal: { data: unknown; isLoading: boolean; error: unknown } = {
  data: undefined,
  isLoading: false,
  error: null,
};

jest.mock("@/hooks/api/dashboard", () => ({
  usePersonalDashboard: () => personal,
}));

import { TimesheetWidget } from "@/components/dashboard/timesheet-widget";

function dashboard(timesheetStatus: { submitted: boolean; weekLabel: string; hoursLogged: number }, degraded: string[] = []) {
  return { myTasks: [], timesheetStatus, upcomingEvents: [], degraded };
}

describe("TimesheetWidget — a week with nothing logged is an empty state, not an error", () => {
  beforeEach(() => {
    personal.data = undefined;
    personal.error = null;
    personal.isLoading = false;
  });

  it("renders the empty state for a new joiner with zero hours instead of a red 'Hours Missing' alarm", () => {
    personal.data = dashboard({ submitted: false, weekLabel: "Sep 21 – Sep 27", hoursLogged: 0 });
    render(<TimesheetWidget />);

    expect(screen.getByText("No hours logged this week")).toBeInTheDocument();
    expect(screen.getByText(/Sep 21 – Sep 27/)).toBeInTheDocument();
    expect(screen.queryByText(/hours missing/i)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still shows logged hours as a status card", () => {
    personal.data = dashboard({ submitted: true, weekLabel: "Sep 21 – Sep 27", hoursLogged: 12.5 });
    render(<TimesheetWidget />);

    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("12.5")).toBeInTheDocument();
    expect(screen.queryByText("No hours logged this week")).toBeNull();
  });

  it("keeps a genuine source failure as an announced error", () => {
    personal.data = dashboard({ submitted: false, weekLabel: "Sep 21 – Sep 27", hoursLogged: 0 }, ["timesheet"]);
    render(<TimesheetWidget />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load this week's hours.");
    expect(screen.queryByText("No hours logged this week")).toBeNull();
  });
});
