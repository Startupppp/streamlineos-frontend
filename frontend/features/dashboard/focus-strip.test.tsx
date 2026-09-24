import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { FocusStrip } from "./focus-strip";
import { useFocusStrip } from "./use-focus-strip";
import type { DashboardAccess } from "./use-dashboard-access";
import type { UnifiedInboxCount } from "@/types/inbox";

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return <a href={href} {...props}>{children}</a>;
  };
});

const mockInboxCount: { data: UnifiedInboxCount | undefined; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
const mockApprovals: {
  data: { pendingLeaves: number; pendingResignations: number; total: number } | undefined;
  isLoading: boolean;
} = { data: undefined, isLoading: false };
const mockPersonal: {
  data: {
    myTasks: unknown[];
    timesheetStatus: { submitted: boolean; hoursLogged: number; expectedHours: number } | null;
    upcomingEvents: unknown[];
    degraded: unknown[];
  } | undefined;
  isLoading: boolean;
} = { data: undefined, isLoading: false };

jest.mock("@/hooks/api/inbox", () => ({ useUnifiedInboxCount: () => mockInboxCount }));
jest.mock("@/hooks/api/dashboard", () => ({
  usePendingApprovals: () => mockApprovals,
  usePersonalDashboard: () => mockPersonal,
}));

const baseAccess: DashboardAccess = {
  accessLoading: false, accessResolved: true, refetchAccess: jest.fn(),
  hrEnabled: true, crmEnabled: false, projectsEnabled: true,
  payrollEnabled: false, signEnabled: false,
  canViewEmployees: false, canCreateEmployees: false,
  canViewAttendance: false, canSelfAttendance: false,
  canViewLeaves: false, canApproveLeaves: true,
  canViewExecutive: false, canViewCrmLeads: false, canViewCrmReports: false,
  canViewTickets: true, canViewPayrollSelf: false, canViewSignEnvelopes: false,
};

const emptyData = {
  inboxCount: { notification: 0, mail: 0, approval: 0, total: 0, mailExact: true },
  approvals: { pendingLeaves: 0, pendingResignations: 0, total: 0 },
  personal: { myTasks: [], timesheetStatus: null, upcomingEvents: [], degraded: [] },
};

beforeEach(() => {
  mockInboxCount.data = undefined;
  mockInboxCount.isLoading = false;
  mockApprovals.data = undefined;
  mockApprovals.isLoading = false;
  mockPersonal.data = undefined;
  mockPersonal.isLoading = false;
});

describe("FocusStrip — all-clear state", () => {
  it("shows the all-clear message when no source has actionable data", () => {
    mockInboxCount.data = emptyData.inboxCount;
    mockApprovals.data = emptyData.approvals;
    mockPersonal.data = emptyData.personal;
    render(<FocusStrip access={baseAccess} />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it("renders no links in the all-clear state — not seven empty cards", () => {
    mockInboxCount.data = emptyData.inboxCount;
    mockApprovals.data = emptyData.approvals;
    mockPersonal.data = emptyData.personal;
    render(<FocusStrip access={baseAccess} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("shows loading skeleton while any source is in flight", () => {
    mockInboxCount.isLoading = true;
    render(<FocusStrip access={baseAccess} />);
    expect(screen.getByRole("status", { name: /loading your attention items/i })).toBeInTheDocument();
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
  });
});

describe("FocusStrip — actionable items", () => {
  it("shows pending approvals with a link when canApproveLeaves and total > 0", () => {
    mockInboxCount.data = emptyData.inboxCount;
    mockApprovals.data = { pendingLeaves: 3, pendingResignations: 0, total: 3 };
    mockPersonal.data = emptyData.personal;
    render(<FocusStrip access={baseAccess} />);
    const link = screen.getByRole("link", { name: /3 pending approvals/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("/hr/leaves"));
  });

  it("shows unread notifications with a link to the inbox", () => {
    mockInboxCount.data = { notification: 5, mail: 0, approval: 0, total: 5, mailExact: true };
    mockApprovals.data = emptyData.approvals;
    mockPersonal.data = emptyData.personal;
    render(<FocusStrip access={baseAccess} />);
    const link = screen.getByRole("link", { name: /5 notifications/i });
    expect(link).toHaveAttribute("href", "/inbox?view=notifications");
  });

  it("shows unread mail with a link to the mail inbox", () => {
    mockInboxCount.data = { notification: 0, mail: 2, approval: 0, total: 2, mailExact: true };
    mockApprovals.data = emptyData.approvals;
    mockPersonal.data = emptyData.personal;
    render(<FocusStrip access={baseAccess} />);
    const link = screen.getByRole("link", { name: /2 unread messages/i });
    expect(link).toHaveAttribute("href", "/inbox?view=mail");
  });

  it("shows timesheet exception when hours logged but not submitted", () => {
    mockInboxCount.data = emptyData.inboxCount;
    mockApprovals.data = emptyData.approvals;
    mockPersonal.data = {
      myTasks: [],
      timesheetStatus: { submitted: false, hoursLogged: 16, expectedHours: 40 },
      upcomingEvents: [],
      degraded: [],
    };
    render(<FocusStrip access={baseAccess} />);
    const link = screen.getByRole("link", { name: /timesheet not submitted/i });
    expect(link).toHaveAttribute("href", "/timesheets");
  });

  it("does NOT show timesheet item when timesheet is already submitted", () => {
    mockInboxCount.data = emptyData.inboxCount;
    mockApprovals.data = emptyData.approvals;
    mockPersonal.data = {
      myTasks: [],
      timesheetStatus: { submitted: true, hoursLogged: 40, expectedHours: 40 },
      upcomingEvents: [],
      degraded: [],
    };
    render(<FocusStrip access={baseAccess} />);
    expect(screen.queryByText(/timesheet/i)).not.toBeInTheDocument();
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it("shows upcoming events with a calendar link", () => {
    mockInboxCount.data = emptyData.inboxCount;
    mockApprovals.data = emptyData.approvals;
    mockPersonal.data = {
      myTasks: [], timesheetStatus: null,
      upcomingEvents: [{ id: 1 }, { id: 2 }], degraded: [],
    };
    render(<FocusStrip access={baseAccess} />);
    const link = screen.getByRole("link", { name: /2 upcoming events/i });
    expect(link).toHaveAttribute("href", "/calendar");
  });
});

describe("FocusStrip — permission gates (positive and negative)", () => {
  it("POSITIVE: shows approvals chip when canApproveLeaves is true", () => {
    mockInboxCount.data = emptyData.inboxCount;
    mockApprovals.data = { pendingLeaves: 2, pendingResignations: 0, total: 2 };
    mockPersonal.data = emptyData.personal;
    render(<FocusStrip access={baseAccess} />);
    expect(screen.getByText(/2 pending approvals/i)).toBeInTheDocument();
  });

  it("NEGATIVE: does NOT show approvals chip when canApproveLeaves is false", () => {
    mockInboxCount.data = emptyData.inboxCount;
    mockApprovals.data = { pendingLeaves: 5, pendingResignations: 0, total: 5 };
    mockPersonal.data = emptyData.personal;
    render(<FocusStrip access={{ ...baseAccess, canApproveLeaves: false }} />);
    expect(screen.queryByText(/pending approval/i)).not.toBeInTheDocument();
  });

  it("each attention source produces exactly one item — not multiple cards for the same count", () => {
    mockInboxCount.data = { notification: 3, mail: 2, approval: 0, total: 5, mailExact: true };
    mockApprovals.data = { pendingLeaves: 1, pendingResignations: 0, total: 1 };
    mockPersonal.data = emptyData.personal;
    render(<FocusStrip access={baseAccess} />);
    expect(screen.getAllByText(/3 notifications/i)).toHaveLength(1);
    expect(screen.getAllByText(/2 unread messages/i)).toHaveLength(1);
    expect(screen.getAllByText(/1 pending approval$/i)).toHaveLength(1);
  });
});

describe("useFocusStrip — item ordering", () => {
  it("critical items appear before info items in the list", () => {
    mockInboxCount.data = { notification: 5, mail: 0, approval: 0, total: 5, mailExact: true };
    mockApprovals.data = { pendingLeaves: 2, pendingResignations: 0, total: 2 };
    mockPersonal.data = emptyData.personal;
    const { result } = renderHook(() => useFocusStrip(baseAccess));
    const priorities = result.current.items.map((i) => i.priority);
    const criticalIdx = priorities.indexOf("critical");
    const infoIdx = priorities.indexOf("info");
    if (criticalIdx !== -1 && infoIdx !== -1) {
      expect(criticalIdx).toBeLessThan(infoIdx);
    }
  });

  it("isLoading is true when any source is loading, false when all resolved", () => {
    mockInboxCount.isLoading = true;
    const { result: loading } = renderHook(() => useFocusStrip(baseAccess));
    expect(loading.current.isLoading).toBe(true);

    mockInboxCount.isLoading = false;
    mockInboxCount.data = emptyData.inboxCount;
    mockApprovals.data = emptyData.approvals;
    mockPersonal.data = emptyData.personal;
    const { result: done } = renderHook(() => useFocusStrip(baseAccess));
    expect(done.current.isLoading).toBe(false);
  });
});
