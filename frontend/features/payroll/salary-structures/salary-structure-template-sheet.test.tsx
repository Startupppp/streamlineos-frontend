import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SalaryStructureTemplate } from "@/hooks/api/hr/salary-structures";

jest.mock("@/components/shared/hr-sheet", () => ({
  HrSheet: ({
    open,
    children,
    onSubmit,
    submitLabel,
    submitDisabled,
  }: {
    open: boolean;
    children: ReactNode;
    onSubmit?: () => void;
    submitLabel?: ReactNode;
    submitDisabled?: boolean;
  }) =>
    open ? (
      <div>
        {children}
        <button type="button" onClick={onSubmit} disabled={submitDisabled}>
          {submitLabel}
        </button>
      </div>
    ) : null,
}));

jest.mock("./salary-breakup-preview", () => ({
  ComponentsUsed: () => null,
  SampleCtcPreview: () => null,
}));

import { SalaryStructureTemplateSheet } from "./salary-structure-template-sheet";

const template = {
  id: 1,
  name: "Senior Engineer L3",
  basicSalary: "50000",
  hraPercent: "40",
  specialAllowance: "0",
  medicalAllowance: "0",
  travelAllowance: "0",
  otherAllowances: "0",
  pfDeductionPercent: "12",
  professionalTax: "200",
  effectiveFrom: "2026-10-01",
  effectiveTo: null,
  isActive: true,
} as unknown as SalaryStructureTemplate;

function renderSheet() {
  render(
    <SalaryStructureTemplateSheet
      open
      onOpenChange={jest.fn()}
      template={template}
      onSubmit={jest.fn()}
      isPending={false}
    />,
  );
}

describe("PAY-B-025 every percentage field on the template is held to 0-100", () => {
  it("keeps Save enabled for a well-formed template, so the refusal below is not a form that never submits", async () => {
    renderSheet();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled());
  });

  it("names PF Deduction % and disables Save when PF is 120, even though deductions stay below gross", async () => {
    renderSheet();
    const pf = await screen.findByPlaceholderText("e.g. 12");
    fireEvent.change(pf, { target: { value: "120" } });
    fireEvent.blur(pf);

    expect(await screen.findByText("PF Deduction %: Enter a percentage between 0 and 100.")).toBeInTheDocument();
    expect(await screen.findByText("Enter a percentage between 0 and 100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });
});
