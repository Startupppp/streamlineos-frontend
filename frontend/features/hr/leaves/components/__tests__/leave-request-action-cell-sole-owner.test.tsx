import { render, screen } from "@testing-library/react";

import { useMyApprover } from "@/hooks/api/hr/approvers";
import { RequestActionCell } from "../leave-request-action-cell";
import type { LeaveRequest } from "../leaves-shared";

jest.mock("@/hooks/api/hr/approvers", () => ({
  useMyApprover: jest.fn(),
}));

const mockedRoute = useMyApprover as jest.Mock;

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

describe("BUG-HRMS-017/018: own pending leave row", () => {
  it("points a sole owner at the Action Center, where their own request is decided", () => {
    mockedRoute.mockReturnValue({ data: { ownerSelfApproval: true } });

    render(<RequestActionCell request={pending()} onCancel={jest.fn()} />);

    expect(screen.getByRole("link", { name: /decide in action center/i })).toHaveAttribute("href", "/hr/approvals");
    expect(screen.getByRole("button", { name: /cancel request/i })).toBeInTheDocument();
  });

  it("offers only cancel when someone else approves", () => {
    mockedRoute.mockReturnValue({ data: { ownerSelfApproval: false } });

    render(<RequestActionCell request={pending()} onCancel={jest.fn()} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel request/i })).toBeInTheDocument();
  });
});
