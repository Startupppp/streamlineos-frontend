import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReconciliationMatchPanel } from "./reconciliation-match-panel";
import type { ReconciliationTxn } from "@/hooks/api/accounting/banking";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

jest.mock("@/hooks/api/accounting/banking", () => ({
  useConfirmMatch: () => ({ mutate: jest.fn(), isPending: false }),
  useUnmatch: () => ({ mutate: jest.fn(), isPending: false }),
  useIgnoreTransaction: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/accounting", () => ({
  useAccounts: () => ({ data: { data: [] } }),
}));

jest.mock("@/features/accounting/ai", () => ({
  ReconciliationExplainPanel: () => null,
}));

jest.mock("@/features/accounting/shared", () => ({
  Money: ({ value }: { value: number }) => <span>{value}</span>,
}));

jest.mock("./bank-txn-status-badge", () => ({
  BankTxnStatusBadge: () => null,
}));

const baseTxn: ReconciliationTxn = {
  id: 1,
  bankAccountId: 1,
  txnDate: "2024-01-15",
  description: "Test transaction",
  reference: null,
  counterparty: null,
  amount: "1000",
  status: "SUGGESTED",
  matchType: null,
  matchedRecordId: null,
  createdAt: "2024-01-15T00:00:00.000Z",
  suggestedMatches: [],
};

describe("ReconciliationMatchPanel — confidence bar", () => {
  it("does not render a bar or percentage when confidence is NaN", () => {
    const txn: ReconciliationTxn = {
      ...baseTxn,
      suggestedMatches: [
        {
          id: 42,
          bankTransactionId: 1,
          journalEntryId: null,
          matchedType: "CUSTOMER_PAYMENT",
          matchedRecordId: null,
          amount: "1000",
          confidence: "NaN",
          isConfirmed: false,
          confirmedBy: null,
          confirmedAt: null,
        },
      ],
    };
    const { container } = render(
      <ReconciliationMatchPanel txn={txn} bankAccountId={1} onClose={jest.fn()} />,
      { wrapper: Wrapper },
    );
    expect(container.querySelector(".bg-status-info-fill")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the bar at the correct scale when confidence is a valid percentage", () => {
    const txn: ReconciliationTxn = {
      ...baseTxn,
      suggestedMatches: [
        {
          id: 42,
          bankTransactionId: 1,
          journalEntryId: null,
          matchedType: "CUSTOMER_PAYMENT",
          matchedRecordId: null,
          amount: "1000",
          confidence: "85",
          isConfirmed: false,
          confirmedBy: null,
          confirmedAt: null,
        },
      ],
    };
    const { container } = render(
      <ReconciliationMatchPanel txn={txn} bankAccountId={1} onClose={jest.fn()} />,
      { wrapper: Wrapper },
    );
    const fill = container.querySelector(".bg-status-info-fill") as HTMLElement;
    expect(fill).toBeInTheDocument();
    expect(fill.style.transform).toBe("scaleX(0.85)");
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders the bar at 0 scale when confidence is 0", () => {
    const txn: ReconciliationTxn = {
      ...baseTxn,
      suggestedMatches: [
        {
          id: 42,
          bankTransactionId: 1,
          journalEntryId: null,
          matchedType: "CUSTOMER_PAYMENT",
          matchedRecordId: null,
          amount: "1000",
          confidence: "0",
          isConfirmed: false,
          confirmedBy: null,
          confirmedAt: null,
        },
      ],
    };
    const { container } = render(
      <ReconciliationMatchPanel txn={txn} bankAccountId={1} onClose={jest.fn()} />,
      { wrapper: Wrapper },
    );
    const fill = container.querySelector(".bg-status-info-fill") as HTMLElement;
    expect(fill).toBeInTheDocument();
    expect(fill.style.transform).toBe("scaleX(0)");
  });
});
