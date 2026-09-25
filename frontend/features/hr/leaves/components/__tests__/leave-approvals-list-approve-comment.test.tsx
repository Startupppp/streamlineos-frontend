import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockApproveMutate = jest.fn();
const mockRejectMutate = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

let mockCanDecide = true;
jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanDecide,
}));

jest.mock("@/hooks/api/hr", () => ({
  useApproveLeaveDedicated: () => ({
    mutate: mockApproveMutate,
    isPending: false,
    variables: undefined,
  }),
  useRejectLeaveDedicated: () => ({
    mutate: mockRejectMutate,
    isPending: false,
    variables: undefined,
  }),
}));

import { LeaveApprovalsList } from "@/features/hr/leaves/components/leave-approvals-list";
import type { LeaveRequest } from "@/features/hr/leaves/components/leaves-shared";

const PENDING_REQUEST = {
  id: 7,
  status: "PENDING",
  priority: "MEDIUM",
  reason: "Family event",
  startDate: "2026-09-21",
  endDate: "2026-09-22",
  createdAt: "2026-09-15T00:00:00.000Z",
  leaveType: { id: 1, name: "Annual" },
  approver: null,
  user: {
    id: "user_7",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    image: null,
  },
} as unknown as LeaveRequest;

function renderList() {
  return render(
    <TooltipProvider>
      <LeaveApprovalsList requests={[PENDING_REQUEST]} currentUserId="user_admin" />
    </TooltipProvider>,
  );
}

function openApproveOverlay() {
  fireEvent.click(screen.getByRole("button", { name: /^Approve$/ }));
}

function commentBox(): HTMLTextAreaElement {
  return screen.getByLabelText(/Comment/i) as HTMLTextAreaElement;
}

function confirmApprove() {
  const buttons = screen.getAllByRole("button", { name: /^Approve$/ });
  fireEvent.click(buttons[buttons.length - 1]);
}

describe("LeaveApprovalsList — optional manager comment on Approve (decision #8, PROVISIONAL)", () => {
  beforeEach(() => {
    mockApproveMutate.mockReset();
    mockRejectMutate.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it("offers an optional comment field instead of approving immediately", () => {
    renderList();
    openApproveOverlay();

    expect(mockApproveMutate).not.toHaveBeenCalled();
    expect(commentBox()).toBeInTheDocument();
    expect(screen.getByText(/Optional/i)).toBeInTheDocument();
  });

  it("sends the trimmed comment with the approval", () => {
    renderList();
    openApproveOverlay();
    fireEvent.change(commentBox(), { target: { value: "  Enjoy the break  " } });
    confirmApprove();

    expect(mockApproveMutate).toHaveBeenCalledTimes(1);
    expect(mockApproveMutate.mock.calls[0][0]).toEqual({
      leaveId: 7,
      comment: "Enjoy the break",
    });
  });

  it("approves with no comment when the field is left blank — the comment is never required", () => {
    renderList();
    openApproveOverlay();

    const confirmButtons = screen.getAllByRole("button", { name: /^Approve$/ });
    expect(confirmButtons[confirmButtons.length - 1]).not.toBeDisabled();

    confirmApprove();

    expect(mockApproveMutate).toHaveBeenCalledTimes(1);
    expect(mockApproveMutate.mock.calls[0][0]).toEqual({ leaveId: 7 });
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("still toasts on a successful approval", () => {
    mockApproveMutate.mockImplementation(
      (_vars: unknown, opts: { onSuccess?: () => void }) => opts.onSuccess?.(),
    );
    renderList();
    openApproveOverlay();
    confirmApprove();

    expect(mockToastSuccess).toHaveBeenCalledWith("Request approved successfully");
  });

  it("leaves Reject's required reason untouched — a blank reason never reaches the mutation", () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /^Reject$/ }));

    const confirmReject = screen.getAllByRole("button", { name: /^Reject$/ }).at(-1);
    expect(confirmReject).toBeDisabled();
    expect(mockRejectMutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/Insufficient notice/i), {
      target: { value: "Conflicting deadlines" },
    });
    const enabledReject = screen.getAllByRole("button", { name: /^Reject$/ }).at(-1);
    expect(enabledReject).not.toBeDisabled();
    fireEvent.click(enabledReject as HTMLElement);

    expect(mockRejectMutate).toHaveBeenCalledTimes(1);
    expect(mockRejectMutate.mock.calls[0][0]).toEqual({
      leaveId: 7,
      reason: "Conflicting deadlines",
    });
  });
});

describe("LeaveApprovalsList — decisions need hr:leaves:approve (FE-44)", () => {
  afterEach(() => {
    mockCanDecide = true;
  });

  it("offers Approve and Reject to a caller holding the key", () => {
    renderList();
    expect(screen.getByRole("button", { name: /^Approve$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Reject$/ })).toBeInTheDocument();
  });

  it("shows only the status to a caller without it", () => {
    mockCanDecide = false;
    renderList();
    expect(screen.queryByRole("button", { name: /^Approve$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reject$/ })).not.toBeInTheDocument();
  });
});
