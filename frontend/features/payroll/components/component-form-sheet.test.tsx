import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SalaryComponent } from "@/types/payroll/setup";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const idleMutation = { mutate: jest.fn(), isPending: false };
jest.mock("@/hooks/api/payroll", () => ({
  useCreatePayrollComponent: () => idleMutation,
  useUpdatePayrollComponent: () => idleMutation,
}));

jest.mock("./percent-of-fields", () => ({ PercentOfFields: () => null }));

import { ComponentFormSheet } from "./component-form-sheet";
import { componentFormSchema, toPayCategoryPayload } from "./lib/component-form-schema";
import { salaryComponentContract } from "@/hooks/api/payroll/components-schema";

const component: SalaryComponent = {
  id: 7,
  code: "QA_HRA",
  name: "QA HRA",
  type: "EARNING",
  payCategory: "REGULAR",
  calcMethod: "FIXED",
  amount: "5000.00",
  percent: null,
  formula: null,
  taxable: true,
  showOnPayslip: true,
  includeInCtc: true,
  isStatutory: false,
  statutoryKey: null,
  sortOrder: 0,
  isActive: true,
  effectiveFrom: null,
  effectiveTo: null,
};

describe("PAY-B-005 a component's code is fixed once created", () => {
  it("shows the code read-only on Edit, since the update never sends it", async () => {
    render(<ComponentFormSheet component={component} open onOpenChange={jest.fn()} />);

    const code = await screen.findByDisplayValue("QA_HRA");
    expect(code).toBeDisabled();
  });

  it("keeps the code editable on Add, so the read-only Edit field is not a form that never accepts a code", () => {
    render(<ComponentFormSheet component={null} open onOpenChange={jest.fn()} />);

    expect(document.getElementById("comp-code")).toBeEnabled();
  });
});

describe("Bonus pay category on a salary component", () => {
  beforeEach(() => idleMutation.mutate.mockClear());

  it("shows the pay category for an earning with the saved Bonus selected", async () => {
    render(<ComponentFormSheet component={{ ...component, payCategory: "BONUS" }} open onOpenChange={jest.fn()} />);

    await screen.findByDisplayValue("QA_HRA");
    expect(document.getElementById("comp-pay-category")).toHaveTextContent("Bonus (left out of Labour Code wages)");
  });

  it("hides the pay category for a non-earning component", async () => {
    render(<ComponentFormSheet component={{ ...component, type: "DEDUCTION" }} open onOpenChange={jest.fn()} />);

    await screen.findByDisplayValue("QA_HRA");
    expect(document.getElementById("comp-pay-category")).toBeNull();
  });

  it("does not send payCategory when it is unchanged, so a backend without the field still accepts the save", async () => {
    render(<ComponentFormSheet component={{ ...component, payCategory: "BONUS" }} open onOpenChange={jest.fn()} />);
    await screen.findByDisplayValue("QA_HRA");

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(idleMutation.mutate).toHaveBeenCalledTimes(1));
    const [{ componentId, data }] = idleMutation.mutate.mock.calls[0];
    expect(componentId).toBe(7);
    expect(data.name).toBe("QA HRA");
    expect(data).not.toHaveProperty("payCategory");
  });

  it("sends payCategory only when it changes, and resets a bonus to REGULAR when the type stops being an earning", () => {
    expect(toPayCategoryPayload({ type: "EARNING", payCategory: "BONUS" }, "REGULAR")).toEqual({ payCategory: "BONUS" });
    expect(toPayCategoryPayload({ type: "EARNING", payCategory: "REGULAR" }, "BONUS")).toEqual({ payCategory: "REGULAR" });
    expect(toPayCategoryPayload({ type: "EARNING", payCategory: "BONUS" }, undefined)).toEqual({ payCategory: "BONUS" });
    expect(toPayCategoryPayload({ type: "DEDUCTION", payCategory: "BONUS" }, "BONUS")).toEqual({ payCategory: "REGULAR" });
    expect(toPayCategoryPayload({ type: "EARNING", payCategory: "REGULAR" }, undefined)).toEqual({});
    expect(toPayCategoryPayload({ type: "DEDUCTION", payCategory: "REGULAR" }, "REGULAR")).toEqual({});
  });

  it("accepts BONUS in the form schema", () => {
    const parsed = componentFormSchema.safeParse({
      name: "Annual Bonus", code: "ANNUAL_BONUS", type: "EARNING", payCategory: "BONUS", calcMethod: "FIXED",
      amount: "1000", taxable: true, showOnPayslip: true, includeInCtc: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("reads a component from a backend that predates the field as REGULAR, and never throws on a category it does not know", () => {
    const wire = {
      ...component, orgId: "org1", createdAt: "2026-10-18T00:00:00.000Z", updatedAt: "2026-10-18T00:00:00.000Z",
    };
    const withoutCategory = Object.fromEntries(Object.entries(wire).filter(([key]) => key !== "payCategory"));

    expect(salaryComponentContract.parse(withoutCategory).payCategory).toBe("REGULAR");
    expect(salaryComponentContract.parse({ ...wire, payCategory: "BONUS" }).payCategory).toBe("BONUS");
    expect(salaryComponentContract.parse({ ...wire, payCategory: "OVERTIME" }).payCategory).toBe("REGULAR");
  });
});
