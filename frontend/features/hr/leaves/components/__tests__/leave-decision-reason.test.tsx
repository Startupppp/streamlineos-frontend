import { fireEvent, render, screen } from "@testing-library/react";

const approveMutate = jest.fn();
const rejectMutate = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useApproveLeaveDedicated: () => ({
    mutate: approveMutate,
    isPending: false,
    variables: undefined,
  }),
  useRejectLeaveDedicated: () => ({
    mutate: rejectMutate,
    isPending: false,
    variables: undefined,
  }),
}));

jest.mock("@/hooks/api/hr/approvers", () => ({
  useMyApprover: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: (m: string) => toastError(m) },
}));

import {
  LeaveDecisionButtons,
  useLeaveDecisions,
} from "@/features/hr/leaves/components/leave-decision-controls";

const REQUEST = {
  id: 41,
  status: "PENDING",
  user: { id: "usr-member", firstName: "Ada", lastName: "Lovelace" },
};

function Harness() {
  const controls = useLeaveDecisions();
  return (
    <>
      <LeaveDecisionButtons
        request={REQUEST}
        currentUserId="usr-approver"
        processingId={controls.processingId}
        onProcess={controls.onProcess}
      />
      {controls.decisionDialogs}
    </>
  );
}

beforeEach(() => {
  approveMutate.mockReset();
  rejectMutate.mockReset();
  toastError.mockReset();
});

describe("leave decide controls", () => {
  it("refuses a rejection with no reason and never calls the mutation", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /Reject/ }));
    const confirm = screen.getAllByRole("button", { name: /^Reject$/ }).at(-1)!;

    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(rejectMutate).not.toHaveBeenCalled();
  });

  it("sends the reason once one is typed", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /Reject/ }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Conflicting release deadline." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^Reject$/ }).at(-1)!);

    expect(rejectMutate.mock.calls[0][0]).toEqual({
      leaveId: 41,
      reason: "Conflicting release deadline.",
    });
  });

  it("keeps the decide buttons at a 44px touch target on mobile", () => {
    render(<Harness />);

    for (const label of [/Approve/, /Reject/]) {
      expect(screen.getByRole("button", { name: label }).className).toContain(
        "min-h-11",
      );
    }
  });
});
