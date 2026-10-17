import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const processMutate = jest.fn();
const invalidateAttendanceDay = jest.fn();

let pendingRows: unknown[] = [];

jest.mock("@/hooks/api/hr", () => ({
  useHrPendingWfhRequests: () => ({
    data: pendingRows,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useProcessWfhRequest: () => ({ mutate: processMutate, isPending: false }),
}));

jest.mock("@/hooks/api/hr/attendance-day-invalidation", () => ({
  useInvalidateAttendanceDay: () => invalidateAttendanceDay,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
    unavailable: false,
  }),
  useAccess: () => ({ data: { isOrgOwner: true, scopes: {} }, isLoading: false }),
  useModuleEnabled: () => true,
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "usr-admin" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (message: string) => toastSuccess(message),
    error: (message: string) => toastError(message),
  },
}));

import { WfhApprovalsCard } from "@/features/hr/leaves/components/wfh-approvals-card";

function renderCard() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <WfhApprovalsCard />
    </QueryClientProvider>,
  );
}

const ROW = {
  id: 31,
  date: "2026-10-09",
  reason: "Internet work at the office",
  status: "PENDING",
  createdAt: "2026-10-01T00:00:00.000Z",
  user: {
    id: "usr-member",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    image: null,
  },
};

beforeEach(() => {
  pendingRows = [ROW];
  processMutate.mockReset();
  invalidateAttendanceDay.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe("WfhApprovalsCard", () => {
  it("approves through PATCH /hr/wfh/:id and invalidates the attendance day", () => {
    processMutate.mockImplementation(
      (_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess(),
    );
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));

    expect(processMutate.mock.calls[0][0]).toEqual({
      requestId: 31,
      status: "APPROVED",
    });
    expect(invalidateAttendanceDay).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith("WFH request approved");
  });

  it("refuses a rejection with no reason and never calls the mutation", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /Reject$/ }));
    const confirm = screen.getByRole("button", { name: /Reject Request/ });

    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(processMutate).not.toHaveBeenCalled();
  });

  it("sends the reason once one is given", () => {
    processMutate.mockImplementation(
      (_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess(),
    );
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /Reject$/ }));
    fireEvent.change(screen.getByLabelText(/Rejection Reason/), {
      target: { value: "Roster needs you on site." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Reject Request/ }));

    expect(processMutate.mock.calls[0][0]).toEqual({
      requestId: 31,
      status: "REJECTED",
      rejectionReason: "Roster needs you on site.",
    });
    expect(invalidateAttendanceDay).toHaveBeenCalledTimes(1);
  });

  it("says the queue is clear rather than nothing when there is nothing to decide", () => {
    pendingRows = [];
    renderCard();

    expect(screen.getByText("No pending WFH requests")).toBeInTheDocument();
  });
});
