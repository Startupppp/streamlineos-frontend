import { render, screen } from "@testing-library/react";
import { LeaveApprovalItem } from "../leave-approval-item";

jest.mock("@/hooks/api/hr/approvers", () => ({
  useMyApprover: () => ({ data: undefined }),
}));
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
    renderItem({ id: "usr-member", name: "QA RoleMember", firstName: null, lastName: null, image: null });

    expect(screen.getByText("QA RoleMember")).toBeInTheDocument();
  });

  it("builds the name from first and last when the API sent no display name", () => {
    renderItem({ id: "usr-two", name: null, firstName: "Asha", lastName: "Rao", image: null });

    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
  });

  it("shows the same name this person has everywhere else in HR", () => {
    renderItem({ id: "usr-three", name: "QA RoleManager", firstName: "QA", lastName: "Manager", image: null });

    expect(screen.getByText("QA RoleManager")).toBeInTheDocument();
  });

  it("says something rather than nothing when the API sent no person at all", () => {
    renderItem(null);

    expect(screen.getByText(/Unassigned|Unknown/)).toBeInTheDocument();
  });
});
