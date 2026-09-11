import { fireEvent, render, screen } from "@testing-library/react";
import type { CommissionAccrual } from "@/types/crm/commission";
import { AccrualSummary } from "./accrual-summary";
import { AccrualWorking } from "./accrual-working";

const accrual = (over: Partial<CommissionAccrual> = {}): CommissionAccrual => ({
  userId: "u-1",
  planId: "p-1",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  period: "MONTH",
  asOf: "2026-08-29",
  amountMinor: 150_000,
  basisMinor: 3_000_000,
  currency: "INR",
  attainmentBps: 7_500,
  dealCount: 1,
  partCount: 2,
  itemisedPartCount: 2,
  truncated: false,
  deals: [
    {
      sourceType: "deal",
      sourceId: "42",
      dealName: "Acme renewal",
      earningId: "e-1",
      planId: "p-1",
      planVersionId: "pv-1",
      earnedOn: "2026-08-14",
      basisMinor: 3_000_000,
      amountMinor: 150_000,
      rules: [
        {
          tierIndex: 0,
          tierFrom: 0,
          rateBps: 500,
          multiplierBps: 10_000,
          basisMinor: 2_000_000,
          amountMinor: 100_000,
          partCount: 1,
        },
        {
          tierIndex: 1,
          tierFrom: 5_000,
          rateBps: 500,
          multiplierBps: 10_000,
          basisMinor: 1_000_000,
          amountMinor: 50_000,
          partCount: 1,
        },
      ],
    },
  ],
  rules: [
    {
      tierIndex: 0,
      tierFrom: 0,
      rateBps: 500,
      multiplierBps: 10_000,
      basisMinor: 3_000_000,
      amountMinor: 150_000,
      partCount: 2,
    },
  ],
  reconciles: { byDeal: true, byRule: true },
  ...over,
});

describe("AccrualWorking", () => {
  it("lists the deals that produced the figure", () => {
    render(<AccrualWorking accrual={accrual()} locale="en-IN" />);
    expect(screen.getByText("Acme renewal")).toBeInTheDocument();
  });

  /**
   * The point of the screen. A rep disputing a number has to be able to see the
   * bands it was summed from without asking anybody.
   */
  it("opens a deal to show the bands that priced it", () => {
    render(<AccrualWorking accrual={accrual()} locale="en-IN" />);

    expect(screen.queryByText(/Band from 50%/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("row", { name: /Acme renewal/ }));
    expect(screen.getByText(/Band from 50%/)).toBeInTheDocument();
  });

  it("says so plainly when nothing has accrued", () => {
    render(<AccrualWorking accrual={accrual({ deals: [], rules: [] })} locale="en-IN" />);
    expect(screen.getByText(/Nothing has accrued/)).toBeInTheDocument();
  });
});

describe("AccrualSummary", () => {
  it("shows the accrued figure", () => {
    render(<AccrualSummary accrual={accrual()} locale="en-IN" />);
    expect(screen.getByText("Accrued this period")).toBeInTheDocument();
  });

  /**
   * `reconciles` is the backend asserting the parts sum to the headline. A
   * screen that showed the total beside a breakdown that does not add up, and
   * said nothing, would be the one place this module's promise breaks silently.
   */
  it("warns when the breakdown does not add up to the total", () => {
    render(
      <AccrualSummary
        accrual={accrual({ reconciles: { byDeal: false, byRule: true } })}
        locale="en-IN"
      />,
    );
    expect(screen.getByText(/does not add up/i)).toBeInTheDocument();
  });

  it("does not cry mismatch when the itemisation was merely truncated", () => {
    // Truncation makes `reconciles` false by construction -- the roll-ups cover
    // a page and the total covers the period. That is a different message.
    render(
      <AccrualSummary
        accrual={accrual({ truncated: true, reconciles: { byDeal: false, byRule: false } })}
        locale="en-IN"
      />,
    );
    expect(screen.queryByText(/does not add up/i)).not.toBeInTheDocument();
    expect(screen.getByText(/too large to itemise/i)).toBeInTheDocument();
  });
});
