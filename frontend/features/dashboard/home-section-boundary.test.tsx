import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { HomeSectionBoundary } from "./home-section-boundary";

function Exploding(): never {
  throw new Error("section blew up");
}

function Fine() {
  return <p>healthy section content</p>;
}

describe("a failing Home section is contained", () => {
  const consoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  afterAll(() => consoleError.mockRestore());

  it("renders its child when nothing throws", () => {
    render(
      <HomeSectionBoundary sectionLabel="Payroll">
        <Fine />
      </HomeSectionBoundary>,
    );
    expect(screen.getByText("healthy section content")).toBeInTheDocument();
  });

  it("replaces only the failing section and names it", () => {
    render(
      <HomeSectionBoundary sectionLabel="Payroll">
        <Exploding />
      </HomeSectionBoundary>,
    );
    expect(screen.getByText("Payroll is unavailable")).toBeInTheDocument();
  });

  it("keeps a sibling section rendering when its neighbour throws", () => {
    render(
      <div>
        <HomeSectionBoundary sectionLabel="Payroll">
          <Exploding />
        </HomeSectionBoundary>
        <HomeSectionBoundary sectionLabel="Expenses">
          <Fine />
        </HomeSectionBoundary>
      </div>,
    );
    expect(screen.getByText("Payroll is unavailable")).toBeInTheDocument();
    expect(screen.getByText("healthy section content")).toBeInTheDocument();
  });

  it("never leaks the underlying error text to the user", () => {
    render(
      <HomeSectionBoundary sectionLabel="Payroll">
        <Exploding />
      </HomeSectionBoundary>,
    );
    expect(screen.queryByText(/section blew up/)).not.toBeInTheDocument();
  });
});

describe("every Home widget is individually contained", () => {
  const source = readFileSync(
    resolve(process.cwd(), "features", "dashboard", "dashboard-client.tsx"),
    "utf8",
  );

  const WIDGETS = [
    "MyTasksWidget",
    "TimesheetWidget",
    "LeaveBalanceWidget",
    "AlertsWidget",
    "AnnouncementsWidget",
    "UpcomingEventsWidget",
    "BusinessPulseWidget",
    "MyAttendanceWidget",
    "PayrollWidget",
    "ExpensesWidget",
    "RecruitmentWidget",
    "LeavesTodayWidget",
    "TeamAttendanceWidget",
    "PendingApprovalsWidget",
    "BirthdaysWidget",
    "UpcomingHolidaysWidget",
    "PublicDocumentsCard",
    "MyIssuesCard",
    "SprintCard",
    "RecentProjectsCard",
    "RecentActivityCard",
    "TeamCard",
  ];

  it("reads the Home composition file", () => {
    expect(source).toContain("HomeSectionBoundary");
  });

  it("wraps each rendered widget in its own boundary", () => {
    const unwrapped = WIDGETS.filter((widget) => {
      const index = source.indexOf(`<${widget}`);
      if (index < 0) return false;
      return !source.slice(Math.max(0, index - 400), index).includes(
        "HomeSectionBoundary",
      );
    });
    expect(unwrapped).toEqual([]);
  });
});
