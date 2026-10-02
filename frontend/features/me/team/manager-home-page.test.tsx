import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

const mockUsePayrollCutoff = jest.fn();
jest.mock("@/hooks/api/payroll/payroll-cutoff", () => ({
  usePayrollCutoff: () => mockUsePayrollCutoff(),
}));

const mockUseCan = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
  useModuleEnabled: () => true,
}));

const mockApproveMutate = jest.fn();
jest.mock("@/hooks/api/hr/leave-request-mutations", () => ({
  useApproveLeaveDedicated: () => ({ mutate: mockApproveMutate, isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

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
    upcomingLeave: [{ userId: "usr-asha", name: "Asha", startDate: "2026-09-20", endDate: "2026-09-22", leaveTypeId: 1, status: "APPROVED" }],
    probationDue: [{ userId: "usr-asha", name: "Asha", probationEndDate: "2026-10-01", daysLeft: 10 }],
    ...overrides,
  };
}

function settled(data: ManagerHome) {
  mockUseManagerHome.mockReturnValue({ data, isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
  mockUsePageState.mockReturnValue({ kind: "ready" });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseManagerHome.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  mockUsePageState.mockReturnValue({ kind: "loading" });
  mockUsePayrollCutoff.mockReturnValue({ cutoff: null, month: "2026-09", isLoading: false });
  mockUseCan.mockReturnValue(false);
});

describe("ManagerHomePage — a reporting manager's one view", () => {
  it("keeps the title while loading", () => {
    render(<ManagerHomePage />);

    expect(screen.getByRole("heading", { name: "My team" })).toBeInTheDocument();
    expect(screen.queryByTestId("pending-decisions-strip")).not.toBeInTheDocument();
  });

  it("offers a retry when the team cannot be loaded", () => {
    const refetch = jest.fn();
    mockUseManagerHome.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("boom"), refetch });
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("boom") });

    render(<ManagerHomePage />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("gives a non-manager an honest panel back to their own day, not an empty dashboard", () => {
    settled(home({ isManager: false, reports: [], approvals: { leave: 0, wfh: 0, timesheets: 0, workflows: 0, items: [] }, missingTimesheets: [], upcomingLeave: [], probationDue: [] }));

    render(<ManagerHomePage />);

    expect(screen.getByText("You are not a reporting manager")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to my day" })).toHaveAttribute("href", "/me");
    expect(screen.queryByTestId("pending-decisions-strip")).not.toBeInTheDocument();
  });

  it("says a manager with no reports so, in the ticket's words", () => {
    settled(home({ reports: [], approvals: { leave: 0, wfh: 0, timesheets: 0, workflows: 0, items: [] }, missingTimesheets: [], upcomingLeave: [], probationDue: [] }));

    render(<ManagerHomePage />);

    expect(screen.getByText("No direct reports assigned")).toBeInTheDocument();
    expect(screen.getByText("Ask HR to set your reporting line.")).toBeInTheDocument();
  });

  it("puts the pending decisions strip before the roster, and sticks it at narrow widths", () => {
    settled(home());

    render(<ManagerHomePage />);

    const strip = screen.getByTestId("pending-decisions-strip");
    expect(strip).toHaveTextContent("2 awaiting my decision");
    expect(strip.className).toContain("sticky");
    expect(within(strip).getByRole("link", { name: /Open Action Center/ })).toHaveAttribute("href", "/hr/approvals");

    const roster = screen.getByText("Direct reports");
    expect(strip.compareDocumentPosition(roster) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the decisions waiting, the roster with today's status, missing timesheets, upcoming leave and probation", () => {
    settled(home());

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

  it("prints each upcoming leave's own status, so the list evidences its heading (HRMS-E2E-021)", () => {
    settled(home());
    render(<ManagerHomePage />);
    expect(screen.getByLabelText("Leave status: Approved")).toBeInTheDocument();
  });

  it("shows a non-approved status as it is instead of hiding it under the Approved heading", () => {
    const pending = { userId: "usr-asha", name: "Asha", startDate: "2026-09-20", endDate: "2026-09-22", leaveTypeId: 1, status: "PENDING" as const };
    settled(home({ upcomingLeave: [pending] }));
    render(<ManagerHomePage />);
    expect(screen.getByLabelText("Leave status: Pending")).toBeInTheDocument();
    expect(screen.queryByLabelText("Leave status: Approved")).not.toBeInTheDocument();
  });

  it("says plainly when nothing is waiting", () => {
    settled(home({ approvals: { leave: 0, wfh: 0, timesheets: 0, workflows: 0, items: [] }, missingTimesheets: [], upcomingLeave: [], probationDue: [] }));

    render(<ManagerHomePage />);

    expect(screen.getByText("Nothing is waiting on your decision.")).toBeInTheDocument();
    expect(screen.getByText("Every past period on your team is submitted.")).toBeInTheDocument();
    expect(screen.getByText("No approved leave in the next two weeks.")).toBeInTheDocument();
  });

  it("never shows pay, CTC or compensation on the roster, and never links to the unscoped directory", () => {
    settled(home());

    render(<ManagerHomePage />);

    expect(document.body.textContent).not.toMatch(/ctc|cost to company|compensation|gross|net pay/i);
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/^\/hr\/employees/);
      expect(link.getAttribute("href")).not.toMatch(/^\/directory/);
    }
  });

  it("omits the payroll-adjacent line when no cycle is configured and states it when one is", () => {
    settled(home());
    const { unmount } = render(<ManagerHomePage />);
    expect(screen.queryByText(/may affect this payroll cycle/)).not.toBeInTheDocument();
    unmount();

    mockUsePayrollCutoff.mockReturnValue({ cutoff: { title: "Sep inputs cutoff", date: "2026-09-25T00:00:00.000Z" }, month: "2026-09", isLoading: false });
    settled(home());
    render(<ManagerHomePage />);
    expect(screen.getByText(/2 unsettled timesheets on your team may affect this payroll cycle\./)).toBeInTheDocument();
  });

  it("offers a quick approve only to a manager who may decide leave", () => {
    settled(home());
    const { unmount } = render(<ManagerHomePage />);
    expect(screen.queryByRole("button", { name: /Approve leave for Asha/ })).not.toBeInTheDocument();
    unmount();

    mockUseCan.mockImplementation((key: string) => key === "hr:leaves:approve");
    settled(home());
    render(<ManagerHomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Approve leave for Asha" }));
    expect(mockApproveMutate).toHaveBeenCalledWith({ leaveId: 5 }, expect.anything());
  });

  it("opens the person drawer from a roster row with pay withheld", () => {
    settled(home());

    render(<ManagerHomePage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Open" })[0]);

    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("asha@example.test")).toBeInTheDocument();

    const payTab = screen.getByRole("tab", { name: "Pay" });
    fireEvent.mouseDown(payTab);
    fireEvent.click(payTab);
    expect(screen.getByText("Pay details restricted")).toBeInTheDocument();
  });
});
