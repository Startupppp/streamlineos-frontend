/**
 * HRMS-E2E-012. The audit reported the admin's Leave > Approvals list showing
 * requests attributed to someone who had not filed them.
 *
 * The write path is not the cause and does not reproduce: `LeavesWriteService
 * .create` derives the requester's membership from `@CurrentUser()` and never
 * from the body, and `my()` filters on that same `userMembershipId`. A report's
 * submission cannot insert a manager-owned row.
 *
 * What is wrong is on this row, and it is a contract mismatch. The component's
 * hand-written `LeaveRequest` type declares `user.email: string` and has no
 * `name` field at all. The API's `leavesTeamItemSchema` returns
 * `{ id, name, firstName, lastName, image }` — no email. So the fallback
 * `req.user?.email` is always `undefined` at runtime while typechecking clean,
 * and `req.user.name` — the field most people actually have — is never read.
 *
 * Anyone whose first and last name are null therefore renders as **nothing** in
 * the approvals list: a row with dates, a leave type and Approve/Reject buttons,
 * and no indication whose leave it is. That is the state the audit was reading.
 */
import { render, screen } from "@testing-library/react";
import { LeaveApprovalItem } from "../leave-approval-item";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

function makeRequest(user: Record<string, unknown> | null) {
  return {
    id: 41,
    startDate: "2026-10-05",
    endDate: "2026-10-06",
    totalDays: "2",
    status: "PENDING",
    priority: "MEDIUM",
    reason: null,
    leaveType: { name: "Casual Leave" },
    approver: null,
    user,
  };
}

function renderItem(user: Record<string, unknown> | null) {
  render(
    <LeaveApprovalItem
      req={makeRequest(user) as never}
      processingId={null}
      currentUserId="usr-admin"
      onProcess={jest.fn()}
    />,
  );
}

describe("a leave approval row names the person who filed it", () => {
  it("uses the display name when that is all the API sent", () => {
    // The shape the API actually returns for an imported or invited person:
    // `name` set, first and last null. This rendered blank.
    renderItem({ id: "usr-member", name: "QA RoleMember", firstName: null, lastName: null, image: null });

    expect(screen.getByText("QA RoleMember")).toBeInTheDocument();
  });

  it("builds the name from first and last when the API sent no display name", () => {
    // The paired positive: the case that already worked must keep working, or
    // the fix above would be a regression dressed as one.
    renderItem({ id: "usr-two", name: null, firstName: "Asha", lastName: "Rao", image: null });

    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
  });

  it("shows the same name this person has everywhere else in HR", () => {
    // `getUserDisplayName` prefers `name` over first+last, and the attendance
    // roster, the member picker and the employee picker all resolve through it.
    // A row that picked differently would label the same person two ways on two
    // screens, which is the confusion this ticket is about.
    renderItem({ id: "usr-three", name: "QA RoleManager", firstName: "QA", lastName: "Manager", image: null });

    expect(screen.getByText("QA RoleManager")).toBeInTheDocument();
  });

  it("says something rather than nothing when the API sent no person at all", () => {
    renderItem(null);

    expect(screen.getByText(/Unassigned|Unknown/)).toBeInTheDocument();
  });
});
