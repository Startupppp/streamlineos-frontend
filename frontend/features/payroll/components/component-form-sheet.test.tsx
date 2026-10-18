import { render, screen } from "@testing-library/react";
import type { SalaryComponent } from "@/types/payroll/setup";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const idleMutation = { mutate: jest.fn(), isPending: false };
jest.mock("@/hooks/api/payroll", () => ({
  useCreatePayrollComponent: () => idleMutation,
  useUpdatePayrollComponent: () => idleMutation,
}));

jest.mock("./percent-of-fields", () => ({ PercentOfFields: () => null }));

import { ComponentFormSheet } from "./component-form-sheet";

const component: SalaryComponent = {
  id: 7,
  code: "QA_HRA",
  name: "QA HRA",
  type: "EARNING",
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
