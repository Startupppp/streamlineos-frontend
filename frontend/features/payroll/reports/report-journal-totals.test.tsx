import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportJournal } from "./report-journal";

/**
 * The journal footer prints a balance verdict on a payroll period.
 *
 * `JournalReport` had been narrowed to `{ lines, unmappedCodes }`, so the six
 * fields the server actually returns were invisible to this component and it
 * re-derived the two totals itself — `lines.reduce((s, l) => s + Number(l.debit))`
 * in float, over the line set that had survived the server's own filtering. Two
 * consequences, both of which these tests pin:
 *
 *   1. The footer answered "does the table on screen add up", not "does the
 *      journal balance". The server sums every line in integer paise; the client
 *      summed what it was handed. When those differ the client wins the argument
 *      and prints its own verdict.
 *   2. `provisional` — the server's flag for "the run behind these numbers is
 *      not locked, they can still move" — was dropped on the floor, so a
 *      provisional journal rendered an unqualified "Balanced".
 */

jest.mock("@/hooks/api/payroll/reports", () => ({
  usePayrollJournal: jest.fn(),
}));
jest.mock("@/hooks/api/payroll/journal-batches", () => ({
  usePeriodReconciliation: jest.fn(),
}));
// The two sheets are separate surfaces with their own data; stubbing them keeps
// this suite pointed at the footer.
jest.mock("./accounting-mappings-sheet", () => ({
  AccountingMappingsSheet: () => null,
}));
jest.mock("./journal-batches-sheet", () => ({
  JournalBatchesSheet: () => null,
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
  useAccess: jest.fn(() => ({ data: undefined, refetch: jest.fn() })),
}));

const reports = jest.requireMock("@/hooks/api/payroll/reports") as {
  usePayrollJournal: jest.Mock;
};
const batches = jest.requireMock("@/hooks/api/payroll/journal-batches") as {
  usePeriodReconciliation: jest.Mock;
};

const LINE = {
  account: "5000 Salaries",
  description: "Salary January",
  debit: 1000,
  credit: 0,
  costCenter: null,
};

function journal(overrides: Record<string, unknown>) {
  return {
    data: {
      provisional: false,
      month: "2026-01",
      lines: [LINE],
      unmappedCodes: [],
      totalDebits: 1000,
      totalCredits: 1000,
      ...overrides,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  batches.usePeriodReconciliation.mockReturnValue({ data: undefined, isLoading: false });
});

describe("the payroll journal footer reports the server's totals", () => {
  it("prints the server's two sums, not the sum of the rows on screen", () => {
    reports.usePayrollJournal.mockReturnValue(
      journal({ totalDebits: 250_000, totalCredits: 250_000 }),
    );
    render(<ReportJournal month="2026-01" />);

    // The single row carries debit 1000. A footer reading ₹1,000.00 is the
    // client re-deriving the total from the rows it happens to hold.
    const footer = screen.getByText(/total debit/i).textContent ?? "";
    expect(footer).toMatch(/2,50,000\.00/);
    expect(footer).not.toMatch(/₹1,000\.00/);
  });

  it("withholds the balanced verdict when the server's own sides disagree", () => {
    reports.usePayrollJournal.mockReturnValue(
      journal({ totalDebits: 250_000, totalCredits: 249_000 }),
    );
    render(<ReportJournal month="2026-01" />);

    expect(screen.queryByText(/balanced/i)).toBeNull();
  });

  it("gives the balanced verdict when the server's own sides agree", () => {
    reports.usePayrollJournal.mockReturnValue(journal({}));
    render(<ReportJournal month="2026-01" />);

    expect(screen.getByText(/balanced/i)).toBeInTheDocument();
  });

  it("says so when the run behind the figures is not locked", () => {
    reports.usePayrollJournal.mockReturnValue(journal({ provisional: true }));
    render(<ReportJournal month="2026-01" />);

    expect(screen.getByText(/provisional/i)).toBeInTheDocument();
    expect(screen.getByText(/not locked/i)).toBeInTheDocument();
  });

  it("does not call a locked period provisional", () => {
    reports.usePayrollJournal.mockReturnValue(journal({ provisional: false }));
    render(<ReportJournal month="2026-01" />);

    expect(screen.queryByText(/provisional/i)).toBeNull();
  });
});
