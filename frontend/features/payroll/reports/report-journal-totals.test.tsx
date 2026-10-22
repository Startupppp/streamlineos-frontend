import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportJournal } from "./report-journal";


jest.mock("@/hooks/api/payroll/reports", () => ({
  usePayrollJournal: jest.fn(),
}));
jest.mock("@/hooks/api/payroll/journal-batches", () => ({
  usePeriodReconciliation: jest.fn(),
}));
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

  it("withholds the balanced verdict while component codes are still unmapped, and asks for the mapping", () => {
    reports.usePayrollJournal.mockReturnValue(journal({ unmappedCodes: ["UNMAPPED:PF_EMP", "UNMAPPED:PT"] }));
    render(<ReportJournal month="2026-01" />);

    expect(screen.queryByText(/✓ balanced/i)).toBeNull();
    expect(screen.getByText(/not ready to post — map 2 codes/i)).toBeInTheDocument();
    expect(screen.getByText(/placeholder account/i)).toBeInTheDocument();
    expect(screen.queryByText(/excluded from the journal/i)).toBeNull();
  });
});
