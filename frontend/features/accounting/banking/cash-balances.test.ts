/**
 * "Total Cash Balance" used to be `accounts.reduce((s, a) => s + parseFloat(a.currentBalance), 0)`.
 * `fin_bank_accounts.currency` is free text defaulting to INR, so an org holding
 * a USD account beside two INR ones had its dollars and rupees added together
 * and the sum labelled with the org's display currency — a headline figure
 * denominated in nothing, presented as if it were money.
 *
 * No exchange rate travels on the bank-accounts response, so there is no honest
 * single number to show. These tests pin the only correct answer: one exact
 * decimal total per currency, and never a cross-currency sum.
 */
import { sumCashByCurrency } from "./cash-balances";

function account(currency: string, currentBalance: string) {
  return { currency, currentBalance };
}

describe("sumCashByCurrency", () => {
  it("never adds two currencies into one figure", () => {
    const totals = sumCashByCurrency([
      account("INR", "1000.00"),
      account("USD", "500.00"),
      account("INR", "250.50"),
    ]);

    expect(totals).toEqual([
      { currency: "INR", total: "1250.5000" },
      { currency: "USD", total: "500.0000" },
    ]);
    // The defect's answer was the single number 1750.5 — it must not appear as
    // any one currency's total.
    expect(totals.map((t) => t.total)).not.toContain("1750.5000");
  });

  it("keeps a single-currency org on one exact total", () => {
    expect(sumCashByCurrency([account("INR", "10.10"), account("INR", "20.20")])).toEqual([
      { currency: "INR", total: "30.3000" },
    ]);
  });

  it("adds without binary floating-point drift", () => {
    // 0.1 + 0.2 is 0.30000000000000004 in the doubles the old reduce used.
    expect(sumCashByCurrency([account("INR", "0.1"), account("INR", "0.2")])).toEqual([
      { currency: "INR", total: "0.3000" },
    ]);
  });

  it("folds currency case and whitespace onto one bucket", () => {
    expect(sumCashByCurrency([account("inr", "5.00"), account(" INR ", "5.00")])).toEqual([
      { currency: "INR", total: "10.0000" },
    ]);
  });

  it("defaults a blank currency to the column's own default rather than a new bucket", () => {
    expect(sumCashByCurrency([account("", "5.00"), account("INR", "5.00")])).toEqual([
      { currency: "INR", total: "10.0000" },
    ]);
  });

  it("carries an overdrawn account as a negative, not a parse failure", () => {
    expect(sumCashByCurrency([account("INR", "100.00"), account("INR", "-250.75")])).toEqual([
      { currency: "INR", total: "-150.7500" },
    ]);
  });

  it("reads a malformed or absent balance as zero instead of NaN", () => {
    expect(sumCashByCurrency([account("INR", ""), account("INR", "12.34")])).toEqual([
      { currency: "INR", total: "12.3400" },
    ]);
  });

  it("returns nothing at all for an org with no bank accounts", () => {
    expect(sumCashByCurrency([])).toEqual([]);
  });

  it("orders currencies stably so the row does not reshuffle between renders", () => {
    const totals = sumCashByCurrency([
      account("USD", "1.00"),
      account("EUR", "1.00"),
      account("INR", "1.00"),
    ]);

    expect(totals.map((t) => t.currency)).toEqual(["EUR", "INR", "USD"]);
  });
});
