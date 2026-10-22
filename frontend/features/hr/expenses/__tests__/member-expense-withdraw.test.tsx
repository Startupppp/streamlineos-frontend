import { fireEvent, render, screen } from "@testing-library/react";
import { MemberExpenseList } from "@/features/hr/expenses/expense-list";
import type { ExpenseWithRelations } from "@/types/hr/expenses";


function claim(id: number, status: string): ExpenseWithRelations {
  return {
    id,
    orgId: "org-1",
    userId: "u1",
    categoryId: null,
    category: "Travel",
    amount: "120.00",
    currency: "INR",
    description: `claim ${id}`,
    receiptUrl: null,
    receiptFileName: null,
    merchant: null,
    receiptNumber: null,
    receiptHash: null,
    taxAmount: null,
    paymentMethod: null,
    projectId: null,
    status,
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

function renderList(expenses: ExpenseWithRelations[], onWithdraw = jest.fn()) {
  render(
    <MemberExpenseList
      expenses={expenses}
      pagination={{ page: 1, pageSize: 10, total: expenses.length, totalPages: 1 }}
      startItem={1}
      endItem={expenses.length}
      totalPages={1}
      statusFilter="ALL"
      activeFilterCount={0}
      onEdit={jest.fn()}
      onResubmit={jest.fn()}
      onWithdraw={onWithdraw}
      onShowAll={jest.fn()}
      onCreateNew={jest.fn()}
      onPageChange={jest.fn()}
    />,
  );
  return onWithdraw;
}

describe("MemberExpenseList withdraw", () => {
  it("offers Withdraw on a pending claim and hands that claim to the caller", () => {
    const pending = claim(7, "PENDING");
    const onWithdraw = renderList([pending]);
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(onWithdraw).toHaveBeenCalledWith(pending);
  });

  it("does not offer Withdraw once a claim is decided", () => {
    renderList([claim(8, "APPROVED"), claim(9, "REJECTED")]);
    expect(screen.queryByRole("button", { name: "Withdraw" })).toBeNull();
  });

  it("labels a withdrawn claim instead of falling back to Pending", () => {
    renderList([claim(10, "WITHDRAWN")]);
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
  });
});
