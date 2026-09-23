import type { TimesheetPeriod } from "@/features/timesheets/types";
import {
  approvalStanding,
  approvalSubjectOf,
  summarizeBorrowedAuthority,
} from "./approval-standing";

const ME_MEMBERSHIP = 101;
const MANAGER_MEMBERSHIP = 202;
const WORKER_MEMBERSHIP = 303;
const OTHER_MEMBERSHIP = 404;

const ME = String(ME_MEMBERSHIP);
const MANAGER = String(MANAGER_MEMBERSHIP);
const WORKER = String(WORKER_MEMBERSHIP);
const OTHER = String(OTHER_MEMBERSHIP);

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
    approvalRoute: null,
    approvalDueAt: null,
    approvalEscalatedAt: null,
    rejectionReason: null,
    createdAt: "2026-09-07T00:00:00.000Z",
    updatedAt: "2026-09-14T09:00:00.000Z",
    ...over,
  };
}

describe("approvalSubjectOf", () => {
  it("reads the membership ids the period actually carries, stringified", () => {
    expect(
      approvalSubjectOf(
        period({
          userMembershipId: WORKER_MEMBERSHIP,
          currentApproverMembershipId: MANAGER_MEMBERSHIP,
        }),
      ),
    ).toEqual({ userId: WORKER, currentApproverId: MANAGER });
  });

  it("keeps an absent approver absent rather than turning it into an id", () => {
    expect(
      approvalSubjectOf(
        period({ userMembershipId: null, currentApproverMembershipId: null }),
      ),
    ).toEqual({ userId: "", currentApproverId: null });
  });
});

describe("approvalStanding", () => {
  it("calls it self-approval when the timesheet is the viewer's own", () => {
    expect(
      approvalStanding(ME, false, { userId: ME, currentApproverId: MANAGER }),
    ).toBe("self");
  });

  it("does not call it self-approval for an org owner, who may act on their own", () => {
    expect(approvalStanding(ME, true, { userId: ME, currentApproverId: null })).toBe(
      "unassigned",
    );
  });

  it("calls it assigned when the viewer is the named approver", () => {
    expect(
      approvalStanding(ME, false, { userId: WORKER, currentApproverId: ME }),
    ).toBe("assigned");
  });

  it("calls it unassigned when no approver is named", () => {
    expect(
      approvalStanding(ME, false, { userId: WORKER, currentApproverId: null }),
    ).toBe("unassigned");
  });

  it("calls it delegate when someone else is named and the viewer is not the owner", () => {
    expect(
      approvalStanding(ME, false, { userId: WORKER, currentApproverId: MANAGER }),
    ).toBe("delegate");
  });

  it("calls it owner override rather than delegate for an org owner", () => {
    expect(
      approvalStanding(ME, true, { userId: WORKER, currentApproverId: MANAGER }),
    ).toBe("owner-override");
  });

  it("does not claim standing before the session has resolved", () => {
    expect(
      approvalStanding(undefined, false, { userId: WORKER, currentApproverId: MANAGER }),
    ).toBe("unassigned");
  });
});

describe("summarizeBorrowedAuthority", () => {
  it("returns nothing when every row is the viewer's own to decide", () => {
    const rows = [
      period({ id: 1, currentApproverMembershipId: ME_MEMBERSHIP }),
      period({ id: 2, currentApproverMembershipId: null }),
    ];
    expect(summarizeBorrowedAuthority(ME, false, rows)).toBeNull();
  });

  it("counts only the rows assigned to someone else, and lists each approver once", () => {
    const rows = [
      period({ id: 1, currentApproverMembershipId: MANAGER_MEMBERSHIP }),
      period({ id: 2, currentApproverMembershipId: MANAGER_MEMBERSHIP }),
      period({ id: 3, currentApproverMembershipId: ME_MEMBERSHIP }),
      period({ id: 4, currentApproverMembershipId: OTHER_MEMBERSHIP }),
    ];

    expect(summarizeBorrowedAuthority(ME, false, rows)).toEqual({
      standing: "delegate",
      count: 3,
      approverIds: [MANAGER, OTHER],
    });
  });

  it("reports an owner as acting on override, not as a delegate", () => {
    const rows = [period({ id: 1, currentApproverMembershipId: MANAGER_MEMBERSHIP })];

    expect(summarizeBorrowedAuthority(ME, true, rows)?.standing).toBe("owner-override");
  });

  it("ignores the viewer's own submitted timesheet, which they cannot decide at all", () => {
    const rows = [
      period({
        id: 1,
        userMembershipId: ME_MEMBERSHIP,
        currentApproverMembershipId: MANAGER_MEMBERSHIP,
      }),
    ];

    expect(summarizeBorrowedAuthority(ME, false, rows)).toBeNull();
  });

  it("returns nothing for an empty queue", () => {
    expect(summarizeBorrowedAuthority(ME, false, [])).toBeNull();
  });
});
