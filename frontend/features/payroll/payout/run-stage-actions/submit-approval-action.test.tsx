import { render, screen } from "@testing-library/react";
import { SubmitApprovalAction } from "./submit-approval-action";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/payroll", () => ({ useSubmitApproval: () => ({ mutate: jest.fn(), isPending: false }) }));
jest.mock("@/hooks/api/payroll/run-exceptions", () => ({ useRunExceptions: () => ({ data: undefined }) }));

describe("UX-R1-5 Submit for Approval says why it cannot be used", () => {
  it("is disabled and names the open blockers while any remain", () => {
    render(<SubmitApprovalAction runId={4} status="EXCEPTIONS_FOUND" openBlockers={3} />);

    expect(screen.getByRole("button", { name: /submit for approval/i })).toBeDisabled();
    expect(screen.getByText("Resolve 3 open blockers before submitting")).toBeInTheDocument();
  });

  it("is enabled with no reason once no blocker is open", () => {
    render(<SubmitApprovalAction runId={4} status="PREVIEW_READY" openBlockers={0} />);

    expect(screen.getByRole("button", { name: /submit for approval/i })).toBeEnabled();
    expect(screen.queryByText(/before submitting/i)).toBeNull();
  });
});
