import { addDecimals, toDecimalAmount } from "@/lib/accounting/decimal";

/**
 * Totals the bank accounts PER CURRENCY.
 *
 * `fin_bank_accounts.currency` is free text defaulting to INR, so an org can and
 * does hold a USD account beside an INR one. Adding their balances as bare
 * numbers — which is what a single "Total Cash Balance" figure did — publishes a
 * quantity in no currency at all. There is no rate on this response to convert
 * with, so the honest answer is one figure per currency.
 */
export interface CurrencyBalance {
  currency: string;
  total: string;
}

export function sumCashByCurrency(
  accounts: ReadonlyArray<{ currency: string; currentBalance: string }>,
): CurrencyBalance[] {
  const totals = new Map<string, string>();
  for (const account of accounts) {
    const currency = account.currency.trim().toUpperCase() || "INR";
    totals.set(
      currency,
      addDecimals(totals.get(currency) ?? "0", toDecimalAmount(account.currentBalance)),
    );
  }
  return Array.from(totals, ([currency, total]) => ({ currency, total })).sort((a, b) =>
    a.currency.localeCompare(b.currency),
  );
}
