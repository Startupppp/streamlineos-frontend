import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import { CreateExpenseDialog } from "./create-expense-dialog";

const updateMutateAsync = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useCreateExpense: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateExpense: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}));
jest.mock("@/hooks/api/use-upload-file", () => ({
  useUploadFile: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const EXPENSE = { id: 7, category: "Travel", amount: 50, expenseDate: "2026-10-01", description: "Cab to client" };

function renderDialog(onSuccess = jest.fn()) {
  render(
    <CreateExpenseDialog
      open
      onOpenChange={jest.fn()}
      onSuccess={onSuccess}
      categories={["Travel", "Meals"]}
      paymentMethods={["Cash"]}
      editExpense={EXPENSE}
    />,
  );
  return onSuccess;
}

describe("CreateExpenseDialog — R2-UX-G8 a refused save stays in the sheet with its reason", () => {
  beforeEach(() => updateMutateAsync.mockReset());

  it("shows the server's reason inside the sheet, marks the field, keeps the typed values and does not close", async () => {
    const user = userEvent.setup();
    updateMutateAsync.mockRejectedValue(
      new ApiError("Validation failed", 400, "VALIDATION_FAILED", [
        { path: "amount", message: "Amount must be ₹10,00,000 or less" },
      ]),
    );
    const onSuccess = renderDialog();

    await user.click(screen.getByRole("button", { name: "Update Expense" }));

    const banner = await screen.findByText(/^Couldn't save:/);
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner).toHaveTextContent("Amount must be ₹10,00,000 or less");
    expect(screen.getByText("Amount must be ₹10,00,000 or less", { selector: "[data-slot='form-message']" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.00")).toHaveValue("50");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("closes through onSuccess when the save is accepted, so the error path is not the only outcome", async () => {
    const user = userEvent.setup();
    updateMutateAsync.mockResolvedValue({});
    const onSuccess = renderDialog();

    await user.click(screen.getByRole("button", { name: "Update Expense" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
