import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExpenseFormFields } from "./expense-form-fields";
import {
  EXPENSE_AMOUNT_MAX,
  expenseFormSchema,
  type ExpenseFormData,
} from "./expense-form-schema";

const baseValues: ExpenseFormData = {
  category: "Travel",
  customCategory: "",
  amount: "",
  description: "",
  merchant: "",
  paymentMethod: "",
  customPaymentMethod: "",
  expenseDate: "2026-01-01",
};

function parseAmount(amount: string) {
  return expenseFormSchema.safeParse({ ...baseValues, amount });
}

function amountMessages(amount: string): string[] {
  const result = parseAmount(amount);
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path[0] === "amount")
    .map((issue) => issue.message);
}

function Harness({ onValid }: { onValid: (data: ExpenseFormData) => void }) {
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: baseValues,
  });
  const handleValid = (data: ExpenseFormData) => onValid(data);
  return (
    <form onSubmit={form.handleSubmit(handleValid)}>
      <ExpenseFormFields
        form={form}
        categories={["Travel"]}
        paymentMethods={["Cash"]}
        existingReceipts={[]}
        pendingReceipts={[]}
        onAddPendingReceipts={jest.fn()}
        onRemoveExistingReceipt={jest.fn()}
        onRemovePendingReceipt={jest.fn()}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

function amountInput() {
  return screen.getByPlaceholderText("0.00");
}

describe("expense amount schema", () => {
  it("accepts a two-decimal amount such as 250.50", () => {
    expect(amountMessages("250.50")).toEqual([]);
    expect(parseAmount("250.50").success).toBe(true);
  });

  it("accepts the cap exactly and rejects one paisa above it", () => {
    expect(amountMessages(String(EXPENSE_AMOUNT_MAX))).toEqual([]);
    expect(amountMessages(`${EXPENSE_AMOUNT_MAX}.01`)).toEqual([
      "Amount must be ₹10,00,000 or less",
    ]);
  });

  it("rejects three decimal places", () => {
    expect(amountMessages("1.234")).toEqual(["Amount can have at most 2 decimal places"]);
  });

  it("rejects a minus sign, letters and trailing junk as not a positive number", () => {
    expect(amountMessages("-5")).toEqual(["Amount must be a positive number"]);
    expect(amountMessages("abc")).toEqual(["Amount must be a positive number"]);
    expect(amountMessages("5-")).toEqual(["Amount must be a positive number"]);
    expect(amountMessages("250.50")).toEqual([]);
  });

  it("keeps zero and empty on the greater-than-zero message", () => {
    expect(amountMessages("0")).toEqual(["Amount must be greater than 0"]);
    expect(amountMessages("")).toEqual(["Amount must be greater than 0"]);
    expect(amountMessages("0.01")).toEqual([]);
  });
});

describe("expense amount field", () => {
  it("keeps a typed minus sign visible and explains why it is invalid", async () => {
    render(<Harness onValid={jest.fn()} />);

    fireEvent.change(amountInput(), { target: { value: "-5" } });

    expect(amountInput()).toHaveValue("-5");
    expect(await screen.findByText("Amount must be a positive number")).toBeInTheDocument();
  });

  it("keeps pasted letters visible and explains why they are invalid", async () => {
    render(<Harness onValid={jest.fn()} />);

    fireEvent.change(amountInput(), { target: { value: "abc" } });

    expect(amountInput()).toHaveValue("abc");
    expect(await screen.findByText("Amount must be a positive number")).toBeInTheDocument();
  });

  it("shows the limit message and does not submit an over-limit amount", async () => {
    const onValid = jest.fn();
    render(<Harness onValid={onValid} />);

    fireEvent.change(amountInput(), { target: { value: String(EXPENSE_AMOUNT_MAX + 1) } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Amount must be ₹10,00,000 or less")).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
  });

  it("submits 250.50 as typed", async () => {
    const onValid = jest.fn();
    render(<Harness onValid={onValid} />);

    fireEvent.change(amountInput(), { target: { value: "250.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
    expect(onValid.mock.calls[0][0].amount).toBe("250.50");
    expect(screen.queryByText(/Amount must/)).not.toBeInTheDocument();
  });

  it("asks for the Other category name without repeating the field label (HR-U-030)", () => {
    const result = expenseFormSchema.safeParse({ ...baseValues, amount: "10", category: "Other" });
    expect(result.success).toBe(false);
    const messages = result.success
      ? []
      : result.error.issues.filter((i) => i.path[0] === "customCategory").map((i) => i.message);
    expect(messages).toEqual(["Enter a name for the category"]);
  });
});
