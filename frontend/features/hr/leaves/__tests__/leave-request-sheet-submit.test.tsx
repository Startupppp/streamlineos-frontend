import * as React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { ApprovalRoute } from "@/hooks/api/hr/approval-route-schema";

/**
 * V-049 / V-041. The leave request sheet had no component test at all, so
 * nothing held its two invariants: a successful submit ends in a toast and a
 * closed sheet, and a disabled submit button always says why it is disabled.
 */

const requestLeaveMutate = jest.fn();
jest.mock("@/hooks/api/hr", () => ({
  useRequestLeave: () => ({ mutate: requestLeaveMutate, isPending: false }),
  useLeavePolicy: () => ({ data: null }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
  },
}));

jest.mock("@/components/storage/file-upload", () => ({
  FileUpload: () => null,
}));

// A native date input stands in for the calendar popover: jsdom cannot open a
// Radix popover, and the value this control produces is the whole contract.
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

// Radix Select needs pointer geometry jsdom does not have. This stand-in keeps
// the same API and exposes each option as a real, clickable option role.
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
    }) => (
      <Ctx.Provider value={onValueChange}>{children}</Ctx.Provider>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <div role="listbox">{children}</div>
    ),
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => {
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
import { leaveTypeOptionLabel } from "@/features/hr/leaves/leave-type-option-label";

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
  explanation: "Routed to your reporting manager.",
};

const UNROUTED: ApprovalRoute = {
  ...ROUTED,
  rung: null,
  approver: null,
  slaHours: 0,
  skipped: [{ rung: "reporting_manager", userId: null, reason: "no-manager" }],
  explanation: "Nobody can approve this request.",
};

const TYPES = [
  { id: 1, name: "Casual Leave", policyName: "India SMB 2026" },
  { id: 2, name: "Sick Leave", policyName: "Sick Leave" },
];

function renderSheet(props: Partial<React.ComponentProps<typeof LeaveRequestSheet>> = {}) {
  const onOpenChange = jest.fn();
  const view = render(
    <LeaveRequestSheet
      open
      onOpenChange={onOpenChange}
      leaveTypes={TYPES}
      approvalRoute={ROUTED}
      joiningDate={null}
      balances={[]}
      {...props}
    />,
  );
  return { ...view, onOpenChange };
}

function pickOption(name: RegExp) {
  fireEvent.click(screen.getByRole("option", { name }));
}

beforeEach(() => {
  requestLeaveMutate.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe("leaveTypeOptionLabel", () => {
  it("names the policy beside the type when the policy has its own name", () => {
    expect(
      leaveTypeOptionLabel({ name: "Casual Leave", policyName: "India SMB 2026" }),
    ).toBe("Casual Leave · India SMB 2026");
  });

  it("says the name once when the policy adds nothing", () => {
    expect(leaveTypeOptionLabel({ name: "Sick Leave", policyName: "Sick Leave" })).toBe(
      "Sick Leave",
    );
    expect(leaveTypeOptionLabel({ name: "Sick Leave", policyName: null })).toBe(
      "Sick Leave",
    );
    expect(leaveTypeOptionLabel({ name: "Sick Leave" })).toBe("Sick Leave");
  });
});

describe("LeaveRequestSheet", () => {
  it("shows the configured policy beside the leave type in the dropdown", () => {
    renderSheet();

    expect(
      screen.getByRole("option", { name: "Casual Leave · India SMB 2026" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sick Leave" })).toBeInTheDocument();
  });

  it("a successful submit toasts and closes the sheet", async () => {
    requestLeaveMutate.mockImplementation(
      (_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess(),
    );
    const { onOpenChange } = renderSheet();

    pickOption(/Casual Leave/);
    const dates = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
    fireEvent.change(dates[0], { target: { value: "2026-10-05" } });
    fireEvent.change(dates[1], { target: { value: "2026-10-06" } });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Family commitment out of town." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit leave request" }));

    await waitFor(() => expect(requestLeaveMutate).toHaveBeenCalledTimes(1));
    expect(requestLeaveMutate.mock.calls[0][0]).toMatchObject({
      leaveTypeId: 1,
      startDate: "2026-10-05",
      endDate: "2026-10-06",
    });
    expect(toastSuccess).toHaveBeenCalledWith("Leave requested successfully!");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastError).not.toHaveBeenCalled();
  });

  /**
   * V-041. A submit button that is disabled and says nothing is a dead end.
   * Every configuration that disables it must also render the explanation.
   */
  it.each([
    [
      "no leave type is configured",
      { leaveTypes: [] },
      "Set up leave types first",
      /No leave types configured/i,
    ],
    [
      "nobody can approve the request",
      { approvalRoute: UNROUTED },
      "No approver available",
      /Nobody can approve this request/i,
    ],
  ])("every disabled submit label states why: %s", (_case, props, label, explanation) => {
    renderSheet(props as Partial<React.ComponentProps<typeof LeaveRequestSheet>>);

    const submit = screen.getByRole("button", { name: label });

    expect(submit).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Submit leave request" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(explanation)).toBeInTheDocument();
    // The approver panel is present either way, so the reason is never silent.
    expect(screen.getByText("Approver")).toBeInTheDocument();
  });

  it("enables the plain submit label only when the request is actually routable", () => {
    // The paired positive: without it, a button that could never render would
    // satisfy the negative above.
    renderSheet();
    const footer = screen.getByRole("button", { name: "Submit leave request" });

    expect(footer).toBeEnabled();
  });

  it("names the approver the request is routed to", () => {
    renderSheet();
    const panel = screen.getByText("Approver").parentElement as HTMLElement;

    expect(within(panel).getByText(/Ada Lovelace/)).toBeInTheDocument();
  });
});
