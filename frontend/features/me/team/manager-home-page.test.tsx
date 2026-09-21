import React from "react";
import { render, screen } from "@testing-library/react";
import { ManagerHomePage } from "./manager-home-page";
import type { ManagerHome } from "@/hooks/api/hr/manager-home-schema";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, subtitle }: { children: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, children, onRetry }: { resolution: { kind: string }; loading: React.ReactNode; children: React.ReactNode; onRetry: () => void }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "error")
      return (
        <div role="alert">
          Could not load <button onClick={onRetry}>Retry</button>
        </div>
      );
    return <>{children}</>;
  },
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

const mockUseManagerHome = jest.fn();
jest.mock("@/hooks/api/hr/manager-home", () => ({
  useManagerHome: () => mockUseManagerHome(),
}));

function home(overrides: Partial<ManagerHome> = {}): ManagerHome {
  return {
    isManager: true,
    generatedAt: "2026-09-21T09:00:00.000Z",
    reports: [
      { userId: "usr-asha", membershipId: 11, name: "Asha", email: "asha@example.test", designation: "Engineer", joiningDate: "2026-08-01", lifecycleStatus: "PROBATION", onLeaveToday: true, probationEndsOn: "2026-10-01", unsettledTimesheets: 0 },
      { userId: "usr-ben", membershipId: 12, name: "Ben", email: "ben@example.test", designation: null, joiningDate: null, lifecycleStatus: "ACTIVE", onLeaveToday: false, probationEndsOn: null, unsettledTimesheets: 2 },
    ],
    approvals: {
      leave: 1,
      wfh: 0,
      timesheets: 1,
      workflows: 0,
      items: [
        { kind: "timesheet", id: 42, subjectUserId: "usr-ben", subjectName: "Ben", summary: "Timesheet · 2026-09-07 to 2026-09-13 · 38.5h", requestedAt: "2026-09-14T09:00:00.000Z", dueAt: "2026-09-16T09:00:00.000Z", href: "/timesheets/approvals?period=42" },
        { kind: "leave", id: 5, subjectUserId: "usr-asha", subjectName: "Asha", summary: "Casual leave · 2026-09-28", requestedAt: "2026-09-20T10:00:00.000Z", dueAt: null, href: "/hr/leaves" },
      ],
    },
    missingTimesheets: [
      { periodId: 30, userId: "usr-ben", name: "Ben", periodStart: "2026-09-07", periodEnd: "2026-09-13", status: "OPEN" },
      { periodId: 31, userId: "usr-ben", name: "Ben", periodStart: "2026-09-14", periodEnd: "2026-09-20", status: "REJECTED" },
    ],
    upcomingLeave: [{ userId: "usr-asha", name: "Asha", startDate: "2026-09-20", endDate: "2026-09-22", leaveTypeId: 1 }],
    probationDue: [{ userId: "usr-asha", name: "Asha", probationEndDate: "2026-10-01", daysLeft: 10 }],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseManagerHome.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("ManagerHomePage — a reporting manager's one view", () => {
  it("keeps the title while loading", () => {
    render(<ManagerHomePage />);

    expect(screen.getByRole("heading", { name: "My team" })).toBeInTheDocument();
    expect(screen.queryByText(/Nobody reports to you/)).not.toBeInTheDocument();
  });

  it("offers a retry when the team cannot be loaded", () => {
    const refetch = jest.fn();
    mockUseManagerHome.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("boom"), refetch });
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("boom") });

    render(<ManagerHomePage />);

    screen.getByRole("button", { name: "Retry" }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it("tells a member with no direct reports so, instead of an empty dashboard", () => {
    mockUseManagerHome.mockReturnValue({ data: home({ isManager: false, reports: [], approvals: { leave: 0, wfh: 0, timesheets: 0, workflows: 0, items: [] }, missingTimesheets: [], upcomingLeave: [], probationDue: [] }), isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<ManagerHomePage />);

    expect(screen.getByText("Nobody reports to you yet")).toBeInTheDocument();
    expect(screen.queryByText("Needs my decision")).not.toBeInTheDocument();
  });

  it("shows the decisions waiting, the roster with today's status, missing timesheets, upcoming leave and probation", () => {
    mockUseManagerHome.mockReturnValue({ data: home(), isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<ManagerHomePage />);

    expect(screen.getByText("2 direct reports")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review timesheet" })).toHaveAttribute("href", "/timesheets/approvals?period=42");
    expect(screen.getByRole("link", { name: "Review leave" })).toHaveAttribute("href", "/hr/leaves");
    expect(screen.getByText("On leave")).toBeInTheDocument();
    expect(screen.getByText("2 unsettled")).toBeInTheDocument();
    expect(screen.getByText("Ends Oct 1")).toBeInTheDocument();
    expect(screen.getByText(/10 days left/)).toBeInTheDocument();
    expect(screen.getByText(/Sep 7 – Sep 13 · open/)).toBeInTheDocument();
    expect(screen.getByText(/Sep 20 – Sep 22/)).toBeInTheDocument();
  });

  it("says plainly when nothing is waiting", () => {
    mockUseManagerHome.mockReturnValue({ data: home({ approvals: { leave: 0, wfh: 0, timesheets: 0, workflows: 0, items: [] }, missingTimesheets: [], upcomingLeave: [], probationDue: [] }), isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<ManagerHomePage />);

    expect(screen.getByText("Nothing is waiting on your decision.")).toBeInTheDocument();
    expect(screen.getByText("Every past period on your team is submitted.")).toBeInTheDocument();
    expect(screen.getByText("No approved leave in the next two weeks.")).toBeInTheDocument();
  });
});
