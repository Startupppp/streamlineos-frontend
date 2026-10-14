import { render, screen } from "@testing-library/react";
import type { Reimbursement } from "@/hooks/api/hr/reimbursements";
import { buildReimbursementColumns } from "./reimbursement-columns";

function pendingClaim(userId: string): Reimbursement {
  return {
    id: 7,
    userId,
    category: "Travel",
    amount: "250.00",
    description: null,
    receiptUrl: null,
    status: "PENDING",
    approvedBy: null,
    rejectionReason: null,
    createdAt: "2026-10-13T00:00:00.000Z",
  };
}

function renderActions(row: Reimbursement) {
  const columns = buildReimbursementColumns({
    canApprove: true,
    currentUserId: "me",
    isProcessing: false,
    onApprove: jest.fn(),
    onReject: jest.fn(),
  });
  const actions = columns.find((c) => c.key === "actions");
  if (!actions) throw new Error("no actions column");
  render(<>{actions.cell(row)}</>);
}

/** 03-SECURITY: PATCH /hr/reimbursements/:id refuses a requester deciding their own claim. */
describe("the payroll reimbursements approve control", () => {
  it("is offered on someone else's pending claim", () => {
    renderActions(pendingClaim("someone-else"));
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });

  it("is replaced on your own claim, which the server would refuse", () => {
    renderActions(pendingClaim("me"));
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByText(/another approver decides/)).toBeInTheDocument();
  });
});
