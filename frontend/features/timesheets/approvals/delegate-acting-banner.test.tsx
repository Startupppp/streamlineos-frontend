import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAccess } from "@/hooks/api/access";
import { useApprovals } from "@/hooks/api/timesheets-core/approvals";
import { useHrEmployees } from "@/hooks/api/hr";
import type { TimesheetPeriod } from "@/features/timesheets/types";
import type { BorrowedAuthority } from "./approval-standing";
import { DelegateActingBanner } from "./delegate-acting-banner";
import { ApprovalsView } from "./approvals-view";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
  useCan: jest.fn(() => true),
  useScope: jest.fn(() => "all"),
  useModuleEnabled: jest.fn(() => true),
  usePermissionGate: jest.fn(() => ({
    permission: "timesheets:approvals:view",
    allowed: true,
    denied: false,
    pending: false,
  })),
}));

jest.mock("@/hooks/api/timesheets-core/approvals", () => ({
  APPROVALS_PAGE_SIZE: 25,
  useApprovals: jest.fn(),
  useBulkApprove: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useBulkReject: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrEmployees: jest.fn(),
  unwrapEmployees: (raw: unknown) => (Array.isArray(raw) ? raw : []),
}));

jest.mock("./approvals-tab-panel", () => ({
  ...jest.requireActual("./approvals-tab-panel"),
  ApprovalsTabPanel: () => null,
}));

jest.mock("./approval-detail-sheet", () => ({
  ApprovalDetailSheet: () => null,
}));

const session = useSession as unknown as jest.Mock;
const access = useAccess as unknown as jest.Mock;
const approvals = useApprovals as unknown as jest.Mock;
const employees = useHrEmployees as unknown as jest.Mock;

const ME_MEMBERSHIP = 101;
const MANAGER_MEMBERSHIP = 202;
const DIRECTOR_MEMBERSHIP = 303;
const WORKER_MEMBERSHIP = 404;

const ME = String(ME_MEMBERSHIP);
const MANAGER = String(MANAGER_MEMBERSHIP);
const DIRECTOR = String(DIRECTOR_MEMBERSHIP);

function period(over: Partial<TimesheetPeriod>): TimesheetPeriod {
  return {
    id: 1,
    orgId: "org_1",
    userMembershipId: WORKER_MEMBERSHIP,
    periodStart: "2026-09-07",
    periodEnd: "2026-09-13",
    status: "SUBMITTED",
    totalHours: "40",
    billableHours: "32",
    nonBillableHours: "8",
    submittedAt: "2026-09-14T09:00:00.000Z",
    approvedAt: null,
    rejectedAt: null,
    lockedAt: null,
    currentApproverMembershipId: null,
    rejectionReason: null,
    createdAt: "2026-09-07T00:00:00.000Z",
    updatedAt: "2026-09-14T09:00:00.000Z",
    ...over,
  };
}

const NAMES: Record<string, string> = {
  [MANAGER]: "Priya Menon",
  [DIRECTOR]: "Tomas Blume",
};

function resolveName(userId: string): string {
  return NAMES[userId] ?? "another approver";
}

function authority(over: Partial<BorrowedAuthority> = {}): BorrowedAuthority {
  return { standing: "delegate", count: 1, approverIds: [MANAGER], ...over };
}

describe("delegate acting banner", () => {
  it("stays silent when the viewer is deciding on their own authority", () => {
    const { container } = render(
      <DelegateActingBanner authority={null} resolveName={resolveName} />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("names the approver whose queue the decision is recorded against", () => {
    render(
      <DelegateActingBanner authority={authority()} resolveName={resolveName} />,
    );

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("You're approving as a delegate");
    expect(banner).toHaveTextContent("1 timesheet here is assigned to Priya Menon.");
  });

  it("warns that a lapsed delegation will refuse the decision", () => {
    render(
      <DelegateActingBanner authority={authority()} resolveName={resolveName} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "will be refused if your delegation has ended",
    );
  });

  it("calls an owner override what it is rather than a delegation", () => {
    render(
      <DelegateActingBanner
        authority={authority({ standing: "owner-override" })}
        resolveName={resolveName}
      />,
    );

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("You're approving as the organisation owner");
    expect(banner).not.toHaveTextContent("delegate");
    expect(banner).toHaveTextContent("the decision is recorded against you");
  });

  it("lists every approver the queue borrows from, and agrees with the count", () => {
    render(
      <DelegateActingBanner
        authority={authority({ count: 3, approverIds: [MANAGER, DIRECTOR] })}
        resolveName={resolveName}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "3 timesheets here are assigned to Priya Menon and Tomas Blume.",
    );
  });

  it("falls back to a neutral phrase when an approver has no resolvable name", () => {
    render(
      <DelegateActingBanner
        authority={authority({ approverIds: ["usr_unknown"] })}
        resolveName={resolveName}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "assigned to another approver",
    );
  });
});

interface ViewState {
  viewerMembershipId?: number | null;
  isOrgOwner?: boolean;
  periods?: TimesheetPeriod[];
}

function renderApprovals({
  viewerMembershipId = ME_MEMBERSHIP,
  isOrgOwner = false,
  periods = [],
}: ViewState = {}) {
  session.mockReturnValue({
    data: { user: { id: "usr_me" }, orgId: "org_1" },
  });
  access.mockReturnValue({
    data: { membershipId: viewerMembershipId, isOrgOwner, scopes: {} },
  });
  approvals.mockReturnValue({
    data: { pages: [{ data: periods, pagination: { limit: 25, nextCursor: null, hasMore: false } }], pageParams: [undefined] },
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
  });
  employees.mockReturnValue({
    data: [
      { id: MANAGER, name: "Priya Menon", email: "priya@example.com" },
      { id: DIRECTOR, name: "Tomas Blume", email: "tomas@example.com" },
    ],
  });
  return render(
    <TooltipProvider>
      <ApprovalsView />
    </TooltipProvider>,
  );
}

describe("approvals page delegate banner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("appears on the page when the pending queue belongs to someone else", () => {
    renderApprovals({
      periods: [
        period({ id: 1, currentApproverMembershipId: MANAGER_MEMBERSHIP, user: { membershipId: MANAGER_MEMBERSHIP, name: "Priya Menon", email: "priya@example.com" } }),
        period({ id: 2, currentApproverMembershipId: MANAGER_MEMBERSHIP, user: { membershipId: MANAGER_MEMBERSHIP, name: "Priya Menon", email: "priya@example.com" } }),
      ],
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "2 timesheets here are assigned to Priya Menon.",
    );
  });

  it("does not appear when every pending timesheet is the viewer's own to decide", () => {
    renderApprovals({
      periods: [
        period({ id: 1, currentApproverMembershipId: ME_MEMBERSHIP }),
        period({ id: 2, currentApproverMembershipId: null }),
      ],
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not appear on an empty pending queue", () => {
    renderApprovals({ periods: [] });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not claim borrowed authority for a principal with no membership", () => {
    renderApprovals({
      viewerMembershipId: null,
      periods: [period({ id: 1, currentApproverMembershipId: MANAGER_MEMBERSHIP })],
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("tells an org owner they are overriding, not standing in", () => {
    renderApprovals({
      isOrgOwner: true,
      periods: [period({ id: 1, currentApproverMembershipId: MANAGER_MEMBERSHIP })],
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "You're approving as the organisation owner",
    );
  });
});
