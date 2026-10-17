import { fireEvent, render, screen } from "@testing-library/react";

const reject = jest.fn();
const reopen = jest.fn();

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/payroll", () => ({
  useRunApprovals: () => ({
    data: [
      {
        id: 3,
        stage: 1,
        stageName: "Finance",
        status: "PENDING",
        actedByMembershipId: null,
        actedAt: null,
        comment: null,
        isCurrentUserApprover: true,
        approverName: "Ada",
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useApproveStage: () => ({ mutate: jest.fn(), isPending: false }),
  useRejectStage: () => ({ mutate: reject, isPending: false }),
  useReopenRun: () => ({ mutate: reopen, isPending: false }),
}));

import { ApprovalStagePanel } from "./approval-stage-panel";

describe("rejecting a pending run reopens it for regeneration", () => {
  beforeEach(() => {
    reject.mockReset();
    reopen.mockReset();
  });

  it("reopens the run when reject leaves the status on Pending Approval", () => {
    reject.mockImplementation((_input, options: { onSuccess: (result: { runStatus: string }) => void }) => {
      options.onSuccess({ runStatus: "PENDING_APPROVAL" });
    });

    render(<ApprovalStagePanel runId={9} status="PENDING_APPROVAL" />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.change(screen.getByPlaceholderText("Rejection reason…"), {
      target: { value: "No employees in this run" },
    });
    const rejectButtons = screen.getAllByRole("button", { name: "Reject" });
    fireEvent.click(rejectButtons[rejectButtons.length - 1]);

    expect(reject).toHaveBeenCalledWith(
      { runId: 9, approvalId: 3, comment: "No employees in this run" },
      expect.any(Object),
    );
    expect(reopen).toHaveBeenCalledWith(
      { runId: 9, reason: "No employees in this run" },
      expect.any(Object),
    );
  });
});
