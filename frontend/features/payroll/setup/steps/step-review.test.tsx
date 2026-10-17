import { render, screen } from "@testing-library/react";
import { StepReview } from "./step-review";

jest.mock("@/hooks/api/payroll", () => ({
  usePreviewPolicy: () => ({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    data: {
      components: [],
      approvalChain: [{ stage: 1, stageName: "Finance approval", requiredPermission: "payroll:runs:approve" }],
      essOptions: {
        showSalaryStructure: false,
        allowBankUpdate: false,
        allowLoanRequests: false,
        allowTaxDeclarations: true,
        allowReimbursements: false,
      },
      statutoryPack: null,
      calendarPlan: [],
    },
  }),
}));

describe("StepReview (PAY-B-002) — showed payroll:runs:approve and allowTaxDeclarations raw", () => {
  it("shows the approval stage and the self-service option by their labels", () => {
    render(<StepReview draft={{}} goNext={jest.fn()} goBack={jest.fn()} />);

    expect(screen.getByText("Finance approval")).toBeInTheDocument();
    expect(screen.getByText("Allow Tax Declarations")).toBeInTheDocument();
    expect(screen.queryByText("payroll:runs:approve")).not.toBeInTheDocument();
    expect(screen.queryByText("allowTaxDeclarations")).not.toBeInTheDocument();
  });
});
