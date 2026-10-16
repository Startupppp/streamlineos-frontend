import { fireEvent, render, screen } from "@testing-library/react";
import { MemberExpenseList } from "@/features/hr/expenses/expense-list";
import type { ExpenseWithRelations } from "@/types/hr/expenses";

/**
 * NEW-6: the backend has `POST /me/expenses/:expenseId/withdraw` for a PENDING
 * claim, but the employee list offered no way to reach it, so a mistaken
 * claim stayed in the approval queue forever.
 */

function claim(id: number, status: ExpenseWithRelations["status"]): ExpenseWithRelations {
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
    paymentMethod: null,
    projectId: null,
    status,
    approverId: null,
    approvedAt: null,
    rejectionReason: null,
    paidAt: null,
    transactionRef: null,
    expenseDate: "2026-10-01",
    createdAt: null,
    updatedAt: null,
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
