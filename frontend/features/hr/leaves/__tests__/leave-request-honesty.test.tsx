import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { ApprovalRoute } from "@/hooks/api/hr/approval-route-schema";

const requestLeaveMutate = jest.fn();
jest.mock("@/hooks/api/hr", () => ({
  useRequestLeave: () => ({ mutate: requestLeaveMutate, isPending: false }),
  useLeavePolicy: () => ({ data: null }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/components/storage/file-upload", () => ({
  FileUpload: () => null,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      type="date"
      aria-label={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

jest.mock("@/components/ui/select", () => {
  const Ctx = React.createContext<(v: string) => void>(() => {});
  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange: (v: string) => void;
      value?: string;
    }) => <Ctx.Provider value={onValueChange}>{children}</Ctx.Provider>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <div role="listbox">{children}</div>
    ),
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const onValueChange = React.useContext(Ctx);
      return (
        <button type="button" role="option" aria-selected={false} onClick={() => onValueChange(value)}>
          {children}
        </button>
      );
    },
  };
});

import { LeaveRequestSheet } from "@/features/hr/leaves/leave-request-sheet";
import type { LeaveSpan } from "@/features/hr/leaves/leave-overlap";

const ROUTED: ApprovalRoute = {
  kind: "leave",
  subjectUserId: "usr-1",
  permission: "hr:leaves:approve",
  resolvedAt: "2026-09-25T00:00:00.000Z",
  rung: "reporting_manager",
  assignedTo: null,
  approver: {
    userId: "usr-mgr",
    membershipId: 2,
    name: "Ada Lovelace",
    email: "ada@example.test",
    designation: "Engineering Manager",
  },
  delegation: null,
  queue: null,
  skipped: [],
  slaHours: 24,
  dueAt: "2026-09-26T00:00:00.000Z",
  escalation: null,
  ownerSelfApproval: false,
  explanation: "Routed to your reporting manager.",
};

const TYPES = [{ id: 1, name: "Casual Leave", daysPerYear: 12 }];

const APPROVED_SPAN: LeaveSpan = {
  id: 9,
  status: "APPROVED",
  startDate: "2026-10-05",
  endDate: "2026-10-07",
  leaveType: { name: "Casual Leave" },
};

function renderSheet(props: Partial<React.ComponentProps<typeof LeaveRequestSheet>> = {}) {
  return render(
    <LeaveRequestSheet
      open
      onOpenChange={jest.fn()}
      leaveTypes={TYPES}
      approvalRoute={ROUTED}
      joiningDate={null}
      balances={[]}
      {...props}
    />,
  );
}

function fillRequest(from: string, to: string) {
  fireEvent.click(screen.getByRole("option", { name: /Casual Leave/ }));
  const dates = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
  fireEvent.change(dates[0], { target: { value: from } });
  fireEvent.change(dates[1], { target: { value: to } });
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Family commitment out of town." },
  });
}

beforeEach(() => {
  requestLeaveMutate.mockReset();
});

describe("LeaveRequestSheet honesty", () => {
  it("blocks an overlap with approved leave, names the conflict, and never submits it", () => {
    renderSheet({ existingRequests: [APPROVED_SPAN] });
    fillRequest("2026-10-06", "2026-10-06");

    expect(screen.getByRole("alert")).toHaveTextContent(/overlap your approved Casual Leave/i);
    const submit = screen.getByRole("button", { name: "Dates overlap approved leave" });
    expect(submit).toBeDisabled();

    fireEvent.click(submit);
    expect(requestLeaveMutate).not.toHaveBeenCalled();
  });

  it("submits once the dates clear the approved leave", async () => {
    renderSheet({ existingRequests: [APPROVED_SPAN] });
    fillRequest("2026-10-08", "2026-10-09");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit leave request" }));
    await waitFor(() => expect(requestLeaveMutate).toHaveBeenCalledTimes(1));
  });

  it("says the balance is unavailable rather than guessing one or spinning", () => {
    renderSheet();
    fillRequest("2026-10-08", "2026-10-09");

    expect(screen.getByText(/No balance is available for Casual Leave yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/This will consume/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("previews the balance when the API returned one", () => {
    renderSheet({
      balances: [
        { id: 1, leaveTypeId: 1, balance: "8", typeName: "Casual Leave", daysPerYear: 12 },
      ],
    });
    fillRequest("2026-10-08", "2026-10-09");

    expect(screen.getByText(/This will consume/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/No balance is available for Casual Leave yet/i),
    ).not.toBeInTheDocument();
  });

  it("labels the LOP warning a hint and shows no money figure", () => {
    renderSheet({
      balances: [
        { id: 1, leaveTypeId: 1, balance: "1", typeName: "Casual Leave", daysPerYear: 12 },
      ],
    });
    fillRequest("2026-10-08", "2026-10-09");

    const hint = screen.getByRole("note");
    expect(hint).toHaveTextContent(/^Hint/);
    expect(hint).toHaveTextContent(/may affect LOP/);
    expect(hint.textContent).not.toMatch(/[₹$]|\bINR\b/);
  });
});
