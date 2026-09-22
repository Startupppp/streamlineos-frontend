import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { InputsSectionTabs } from "./inputs-section-tabs";

/**
 * Every input tab destructured only `{ data, isLoading, isFetching }`, so a
 * failed snapshot read arrived as `data: undefined` and rendered "No data —
 * Build the period first." over a period that was already built. Each tab now
 * distinguishes the failure and offers a retry.
 */

jest.mock("@/hooks/api/payroll/payroll-inputs", () => ({
  useAttendanceSnapshot: jest.fn(),
  useLeaveSnapshot: jest.fn(),
  useOvertimeSnapshot: jest.fn(),
  useReimbursementSnapshot: jest.fn(),
  usePayrollAdjustments: jest.fn(),
  useApprovePayrollAdjustment: () => ({ mutate: jest.fn(), isPending: false }),
}));

const inputs = jest.requireMock("@/hooks/api/payroll/payroll-inputs") as Record<string, jest.Mock>;

const refetch = jest.fn();

function failed() {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: true,
    error: new ApiError("Internal server error", 500),
    refetch,
  };
}

function empty() {
  return {
    data: { data: [], pagination: { nextCursor: null, hasMore: false } },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch,
  };
}

function noop(): void {}

beforeEach(() => {
  jest.clearAllMocks();
  for (const hook of Object.values(inputs)) if (jest.isMockFunction(hook)) hook.mockReturnValue(empty());
});

describe("payroll input tabs distinguish a failed snapshot from an unbuilt period", () => {
  it("the attendance tab offers retry instead of 'Build the period first.'", () => {
    inputs.useAttendanceSnapshot.mockReturnValue(failed());
    render(<InputsSectionTabs periodId={3} isLocked={false} onCreateAdjustment={noop} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load attendance inputs/i);
    expect(screen.queryByText(/build the period first/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("the attendance tab still says the period is unbuilt when the snapshot really is empty", () => {
    render(<InputsSectionTabs periodId={3} isLocked={false} onCreateAdjustment={noop} />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/build the period first/i)).toBeInTheDocument();
  });

  it.each([
    ["leave", "Leave", "useLeaveSnapshot", /couldn't load leave inputs/i],
    ["overtime", "Overtime", "useOvertimeSnapshot", /couldn't load overtime inputs/i],
    ["reimbursements", "Reimbursements", "useReimbursementSnapshot", /couldn't load reimbursement inputs/i],
    ["adjustments", "Adjustments", "usePayrollAdjustments", /couldn't load adjustments/i],
  ])("the %s tab offers retry on a failed load", (_tab, trigger, hook, title) => {
    inputs[hook].mockReturnValue(failed());
    render(<InputsSectionTabs periodId={3} isLocked={false} onCreateAdjustment={noop} />);

    fireEvent.mouseDown(screen.getByRole("tab", { name: trigger }));
    fireEvent.click(screen.getByRole("tab", { name: trigger }));

    expect(screen.getByRole("alert")).toHaveTextContent(title);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
