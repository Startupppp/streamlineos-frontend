import { render, screen } from "@testing-library/react";
import { AdminExpenseItem } from "@/features/hr/expenses/expense-item";
import type { ExpenseWithRelations } from "@/types/hr/expenses";

function claim(userId: string): ExpenseWithRelations {
  return {
    id: 6,
    orgId: "org-1",
    userId,
    categoryId: null,
    category: "Travel",
    amount: "120.00",
    currency: "INR",
    description: "claim 6",
    receiptUrl: null,
    receiptFileName: null,
    merchant: null,
    receiptNumber: null,
    receiptHash: null,
    taxAmount: null,
    paymentMethod: null,
    projectId: null,
    status: "PENDING",
    userMembershipId: null,
    approverId: null,
    approverMembershipId: null,
    approvedAt: null,
    rejectionReason: null,
    paidAt: null,
    transactionRef: null,
    reimbursementBatchId: null,
    postedJournalEntryId: null,
    policyFlag: null,
    expenseDate: "2026-10-01",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    user: null,
    approver: null,
    expenseCategory: null,
  };
}

function renderItem(expense: ExpenseWithRelations) {
  render(
    <AdminExpenseItem
      expense={expense}
      currentUserId="owner-1"
      rejectingId={null}
      rejectionReason=""
      isPending={false}
      pendingId={null}
      onApprove={jest.fn()}
      onRejectStart={jest.fn()}
      onRejectConfirm={jest.fn()}
      onRejectCancel={jest.fn()}
      onRejectionReasonChange={jest.fn()}
    />,
  );
}

describe("AdminExpenseItem own pending claim", () => {
  it("explains why the owner's own pending claim has no decision buttons", () => {
    renderItem(claim("owner-1"));

    expect(screen.getByText("Needs another approver")).toBeInTheDocument();
    expect(screen.getByText(/You can't decide your own request/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("keeps Approve and Reject on someone else's pending claim", () => {
    renderItem(claim("employee-2"));

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.queryByText("Needs another approver")).not.toBeInTheDocument();
  });
});
