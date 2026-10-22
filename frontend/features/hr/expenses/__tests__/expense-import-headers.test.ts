import {
  EXPENSE_IMPORT_FIELDS,
  normalizeHeader,
  resolveImportField,
} from "@/features/hr/expenses/expense-import-headers";

describe("expense import headers", () => {
  it("resolves Payment Method, payment_method and paymentMethod to one field", () => {
    for (const spelling of [
      "Payment Method",
      "payment_method",
      "paymentMethod",
      "Payment-Method",
      "PAYMENT METHOD",
      " payment method ".trim(),
    ])
      expect(resolveImportField(spelling)).toBe("paymentMethod");
  });

  it("resolves the date column the same way, including its alias", () => {
    for (const spelling of ["Expense Date", "expense_date", "Expense-Date", "expenseDate"])
      expect(resolveImportField(spelling)).toBe("expenseDate");
    expect(resolveImportField("date")).toBe("expenseDate");
  });

  it("says nothing rather than inventing a field for a column that is not ours", () => {
    expect(resolveImportField("project code")).toBeNull();
    expect(resolveImportField("")).toBeNull();
  });

  it("normalises exactly as the backend does: lowercase, then strip spaces, underscores and dashes", () => {
    expect(normalizeHeader("Payment-Method")).toBe("paymentmethod");
    expect(normalizeHeader("EXPENSE _ DATE")).toBe("expensedate");
  });

  it("the generated template headers equal the fields the validator accepts", () => {
    const templateHeaders = EXPENSE_IMPORT_FIELDS.map((field) => field.key);

    expect(templateHeaders).toEqual([
      "category",
      "amount",
      "description",
      "merchant",
      "paymentMethod",
      "expenseDate",
    ]);
    for (const header of templateHeaders)
      expect(resolveImportField(header)).toBe(header);
  });
});
