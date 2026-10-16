import { render, screen } from "@testing-library/react";
import { useStockGlReconciliation, useUnpostedMovements } from "@/hooks/api/accounting/reports";
import { StockReconciliationReport } from "../stock-reconciliation-report";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/accounting/reports/stock-reconciliation",
  useSearchParams: () => new URLSearchParams("from=2026-10-01&to=2026-10-31"),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/hooks/api/accounting/ledger", () => ({
  useAccountingBook: () => ({ data: { baseCurrency: "INR" }, isLoading: false }),
}));

jest.mock("@/hooks/api/accounting/reports", () => ({
  useStockGlReconciliation: jest.fn(),
  useUnpostedMovements: jest.fn(),
}));

const loaded = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: jest.fn() });

const movement = (transactionId: number) => ({
  transactionId,
  postingDate: "2026-10-05",
  transactionType: "STOCK_ADJUSTMENT",
  referenceType: null,
  referenceId: null,
  valueMinor: 1000,
  reason: "no_posting_path" as const,
});

function arrange(enabled: boolean) {
  (useStockGlReconciliation as jest.Mock).mockReturnValue(
    loaded({
      enabled,
      from: "2026-10-01",
      to: "2026-10-31",
      glMovementMinor: 5000,
      postedMovementValueMinor: 5000,
      unpostedValueMinor: 3000,
      bridgeDifferenceMinor: 0,
      verdict: "explained_by_unposted",
      exceptions: [],
      notes: [],
    }),
  );
  (useUnpostedMovements as jest.Mock).mockReturnValue(
    loaded({
      enabled,
      from: "2026-10-01",
      to: "2026-10-31",
      movements: 2,
      valueMinor: 3000,
      // Three unposted in all, one of them never posts by design; the sample holds two.
      byReason: [
        { reason: "no_posting_path", movements: 2, valueMinor: 2000 },
        { reason: "not_applicable", movements: 1, valueMinor: 1000 },
      ],
      byTransactionType: [],
      sample: [movement(1), movement(2)],
      notes: ["Sample is capped."],
    }),
  );
}

describe("StockReconciliationReport", () => {
  it("states the verdict and that the movement list is a sample of every unposted movement", () => {
    arrange(true);
    render(<StockReconciliationReport />);

    expect(screen.getByText("Gap explained by unposted stock")).toBeInTheDocument();
    expect(screen.getByText("Showing the first 2 of 3 unposted movements.")).toBeInTheDocument();
    expect(screen.getByText("Sample is capped.")).toBeInTheDocument();
  });

  it("says accounting is off instead of showing a row of zeros", () => {
    arrange(false);
    render(<StockReconciliationReport />);

    expect(screen.getByText("Accounting is not enabled")).toBeInTheDocument();
    expect(screen.queryByText("Gap explained by unposted stock")).toBeNull();
  });
});
