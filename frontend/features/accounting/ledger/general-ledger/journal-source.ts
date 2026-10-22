import type { GlJournalSource } from "@/types/accounting/accounting-kernel";

export const JOURNAL_SOURCE_LABELS: Record<GlJournalSource, string> = {
  manual: "Manual journal",
  opening_balance: "Opening balance",
  sales_invoice: "Invoice",
  credit_note: "Credit note",
  receipt: "Money in",
  purchase_bill: "Bill",
  debit_note: "Vendor credit",
  payment: "Money out",
  bank_fee: "Bank fee",
  bank_transfer: "Transfer",
  payroll_run: "Payroll",
  billing_invoice: "Subscription invoice",
  withholding: "Tax withheld",
  fx_reval: "FX revaluation",
  depreciation: "Depreciation",
  stock_move: "Stock movement",
  period_close: "Period close",
};

const SOURCE_ROUTES: Partial<Record<GlJournalSource, string>> = {
  sales_invoice: "/accounting/invoices",
  credit_note: "/accounting/credit-notes",
  purchase_bill: "/accounting/purchase-bills",
};

export function sourceDocumentHref(
  sourceType: GlJournalSource,
  sourceId: string | null,
): string | null {
  const base = SOURCE_ROUTES[sourceType];
  return base && sourceId ? `${base}/${sourceId}` : null;
}
