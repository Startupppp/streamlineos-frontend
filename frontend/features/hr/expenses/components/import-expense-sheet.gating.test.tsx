/**
 * HRMS-E2E-016a. The Import button was live before a file was chosen. Clicking
 * it ran a handler that returned early on `!file` and did nothing at all — no
 * toast, no validation message, no state change — so the only way to learn that
 * nothing had happened was that nothing happened.
 *
 * The button now states what it is waiting for and stays disabled until there is
 * something to import.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportExpenseSheet } from "./import-expense-sheet";

jest.mock("@/hooks/api/use-import-expenses", () => ({
  useImportExpenses: () => ({ mutateAsync: jest.fn() }),
}));

function renderSheet() {
  const onSuccess = jest.fn();
  render(<ImportExpenseSheet open onOpenChange={jest.fn()} onSuccess={onSuccess} />);
  return { onSuccess };
}

const importButton = (): HTMLButtonElement =>
  screen.getByRole("button", { name: /choose a file to import|import \(|no valid rows/i }) as HTMLButtonElement;

describe("expense import gating", () => {
  it("disables Import until a file is chosen, and says why", () => {
    renderSheet();
    const button = importButton();
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/choose a file to import/i);
  });

  it("enables Import once a file with a valid row is read", async () => {
    const user = userEvent.setup();
    renderSheet();

    const csv = [
      "category,amount,description,merchant,payment_method,expense_date",
      "Travel,450,QA cab to client,QA Cabs,CASH,2026-09-20",
    ].join("\n");
    const file = new File([csv], "expenses.csv", { type: "text/csv" });

    await user.upload(screen.getByLabelText(/upload expense file/i), file);

    expect(await screen.findByRole("button", { name: /import \(1 row\)/i })).toBeEnabled();
  });

  it("keeps Import disabled when every row of the file fails validation", async () => {
    const user = userEvent.setup();
    renderSheet();

    const csv = [
      "category,amount,description,merchant,payment_method,expense_date",
      "Travel,not-a-number,bad row,QA Cabs,CASH,not-a-date",
    ].join("\n");
    await user.upload(
      screen.getByLabelText(/upload expense file/i),
      new File([csv], "expenses.csv", { type: "text/csv" }),
    );

    const button = await screen.findByRole("button", { name: /no valid rows to import/i });
    expect(button).toBeDisabled();
  });
});
