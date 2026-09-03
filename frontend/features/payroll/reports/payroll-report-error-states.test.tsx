import { render, screen } from "@testing-library/react";

import { ReportSummary } from "./report-summary";
import { ReportVariance } from "./report-variance";
import { ReportBankPayout } from "./report-bank-payout";
import { ReportDeptCost } from "./report-dept-cost";
import { ReportCostCenter } from "./report-cost-center";
import { ApiError } from "@/lib/api-envelope";

/**
 * Eleven payroll surfaces destructured only `{ data, isLoading }`, so a server
 * failure — schema drift, a timeout, a revoked permission — arrived as
 * `data: undefined` and fell into the EMPTY state. Two of them then issued an
 * instruction over it:
 *
 *   report-summary   "No payroll run for this period — run payroll for this
 *                     month to see summary figures."
 *   employees-tab    "No employees in this run — generate payroll to include
 *                     employees"
 *
 * A finance operator reading that after a 500 is being told to re-run payroll
 * that has already been run. `reports-page.tsx` has no error boundary either, so
 * nothing above these components caught it.
 *
 * Each assertion drives the real component with the query in its error state and
 * checks that the empty copy is NOT what renders.
 */

jest.mock("@/hooks/api/payroll/reports", () => ({
  usePayrollSummary: jest.fn(),
  usePayrollVariance: jest.fn(),
  usePayrollBankPayout: jest.fn(),
  usePayrollDeptCost: jest.fn(),
  usePayrollCostCenter: jest.fn(),
}));

const reports = jest.requireMock("@/hooks/api/payroll/reports") as Record<string, jest.Mock>;

const refetch = jest.fn();

function failed() {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", 500),
    refetch,
  };
}

function empty(data: unknown) {
  return { data, isLoading: false, isError: false, error: null, refetch };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("payroll reports distinguish a failure from an empty period", () => {
  it("report-summary does not tell the operator to run payroll after a 500", () => {
    reports.usePayrollSummary.mockReturnValue(failed());
    render(<ReportSummary month="2026-01" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load the payroll summary/i);
    expect(screen.queryByText(/run payroll for this month/i)).toBeNull();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("report-summary still shows the empty period when the period really is empty", () => {
    reports.usePayrollSummary.mockReturnValue(empty({ run: null }));
    render(<ReportSummary month="2026-01" />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/no payroll run for this period/i)).toBeInTheDocument();
  });

  it("report-variance reports the failure rather than 'no variance data'", () => {
    reports.usePayrollVariance.mockReturnValue(failed());
    render(<ReportVariance month="2026-01" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load the variance report/i);
    expect(screen.queryByText(/no variance data/i)).toBeNull();
  });

  it("report-bank-payout reports the failure rather than 'no bank payout batches'", () => {
    reports.usePayrollBankPayout.mockReturnValue(failed());
    render(<ReportBankPayout month="2026-01" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load bank payout batches/i);
    expect(screen.queryByText(/no bank payout batches/i)).toBeNull();
  });

  it("report-dept-cost reports the failure rather than 'no department cost data'", () => {
    reports.usePayrollDeptCost.mockReturnValue(failed());
    render(<ReportDeptCost month="2026-01" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load department cost/i);
    expect(screen.queryByText(/no department cost data/i)).toBeNull();
  });

  it("report-cost-center reports the failure rather than 'no cost center data'", () => {
    reports.usePayrollCostCenter.mockReturnValue(failed());
    render(<ReportCostCenter month="2026-01" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load cost center data/i);
    expect(screen.queryByText(/no cost center data/i)).toBeNull();
  });

  it("wires the retry to a real refetch", () => {
    reports.usePayrollSummary.mockReturnValue(failed());
    render(<ReportSummary month="2026-01" />);

    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
