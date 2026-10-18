import { render, screen } from "@testing-library/react";

import { useMyApprover } from "@/hooks/api/hr/approvers";
import { useSession } from "next-auth/react";
import { RequestActionCell } from "../leave-request-action-cell";
import type { LeaveRequest } from "../leaves-shared";

jest.mock("@/hooks/api/hr/approvers", () => ({
  useMyApprover: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

const mockedRoute = useMyApprover as jest.Mock;
const mockedSession = useSession as jest.Mock;

function pending(): LeaveRequest {
  return {
    id: 1,
    startDate: "2026-10-01",
    endDate: "2026-10-01",
    status: "PENDING",
    priority: null,
    reason: null,
    leaveType: { name: "Casual Leave" },
  };
}

beforeEach(() => {
  mockedSession.mockReturnValue({ data: { user: { id: "usr-owner" } } });
});

describe("BUG-HRMS-017/018: own pending leave row", () => {
  it("points a sole owner at the Action Center, where their own request is decided", () => {
    mockedRoute.mockReturnValue({
      data: { ownerSelfApproval: true, approver: { userId: "usr-owner", name: "Owner" } },
    });

    render(<RequestActionCell request={pending()} onCancel={jest.fn()} />);

    expect(screen.getByRole("link", { name: /decide in action center/i })).toHaveAttribute("href", "/hr/approvals");
    expect(screen.getByRole("button", { name: /cancel request/i })).toBeInTheDocument();
  });

  it("does not show the self-approve link when the approver is someone else", () => {
    mockedRoute.mockReturnValue({
      data: {
        ownerSelfApproval: false,
        approver: { userId: "usr-manager", name: "Priya Singh" },
        queue: null,
      },
    });

    render(<RequestActionCell request={pending()} onCancel={jest.fn()} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Awaiting approval from Priya Singh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel request/i })).toBeInTheDocument();
  });

  it("shows the HR queue label when the leave is routed to the queue", () => {
    mockedRoute.mockReturnValue({
      data: {
        ownerSelfApproval: false,
        approver: null,
        queue: { label: "HR approvals", permission: "hr:leaves:approve", memberCount: 2, members: [] },
      },
    });

    render(<RequestActionCell request={pending()} onCancel={jest.fn()} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Awaiting approval from HR approvals")).toBeInTheDocument();
  });

  it("shows a generic Awaiting approval hint and cancel when the route names no approver or queue (UX-14)", () => {
    mockedRoute.mockReturnValue({
      data: { ownerSelfApproval: false, approver: null, queue: null },
    });

    render(<RequestActionCell request={pending()} onCancel={jest.fn()} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Awaiting approval")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel request/i })).toBeInTheDocument();
  });
});
