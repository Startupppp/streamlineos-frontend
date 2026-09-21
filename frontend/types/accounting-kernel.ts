export type GlAccountType =
  | "ASSET"
  | "CONTRA_ASSET"
  | "LIABILITY"
  | "CONTRA_LIABILITY"
  | "EQUITY"
  | "INCOME"
  | "EXPENSE";

export type GlSystemTag =
  | "cash"
  | "bank"
  | "undeposited"
  | "ar_control"
  | "ap_control"
  | "grni"
  | "sales"
  | "other_income"
  | "cogs"
  | "opex"
  | "salary"
  | "equity_capital"
  | "retained_earnings"
  | "current_year_earnings"
  | "fx_gain"
  | "fx_loss"
  | "rounding"
  | "vat_input"
  | "vat_output"
  | "sales_tax_payable"
  | "wht_payable"
  | "gst_input_cgst"
  | "gst_input_sgst"
  | "gst_input_igst"
  | "gst_input_utgst"
  | "gst_input_cess"
  | "gst_output_cgst"
  | "gst_output_sgst"
  | "gst_output_igst"
  | "gst_output_utgst"
  | "gst_output_cess"
  | "psp_clearing"
  | "razorpay_clearing"
  | "stripe_clearing"
  | "payment_fees"
  | "net_pay_clearing"
  | "statutory_payable"
  | "fixed_asset"
  | "accum_depreciation"
  | "depreciation_expense"
  | "deferred_revenue"
  | "inventory"
  | "inventory_write_off"
  | "inventory_adjustment"
  | "landed_cost";

export type GlJournalSource =
  | "manual"
  | "opening_balance"
  | "sales_invoice"
  | "credit_note"
  | "receipt"
  | "purchase_bill"
  | "debit_note"
  | "payment"
  | "bank_fee"
  | "bank_transfer"
  | "payroll_run"
  | "billing_invoice"
  | "withholding"
  | "fx_reval"
  | "depreciation"
  | "stock_move"
  | "period_close";

export type PeriodStatus = "OPEN" | "LOCKED";
export type FiscalYearStatus = "OPEN" | "CLOSED";

export interface AccountingBook {
  id: string;
  name: string;
  countryCode: string;
  baseCurrency: string;
  localizationPack: string;
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
  timezone: string;
  isDefault: boolean;
  status: "ACTIVE" | "ARCHIVED";
}

export interface LocalizationPackSummary {
  code: string;
  title: string;
  status: "enabled" | "stub";
  countryCodes: readonly string[];
  defaultCurrency: string;
  fiscalYearStart: { month: number; day: number };
  taxEngine: string;
}

export interface AccountNode {
  id: string;
  code: string;
  name: string;
  accountType: GlAccountType;
  parentAccountId: string | null;
  isHeader: boolean;
  isActive: boolean;
  isCash: boolean;
  systemTag: GlSystemTag | null;
  currencyRestriction: string | null;
  description: string | null;
  children: AccountNode[];
}

export interface PostableAccount {
  id: string;
  code: string;
  name: string;
  accountType: GlAccountType;
  isCash: boolean;
  systemTag: GlSystemTag | null;
  currencyRestriction: string | null;
}

export interface FiscalYear {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: FiscalYearStatus;
}

export interface AccountingPeriod {
  id: string;
  fiscalYearId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  sequence: number;
  status: PeriodStatus;
  lockedAt: string | null;
  lockReason: string | null;
}

export interface JournalLine {
  id: string;
  lineNo: number;
  accountId: string;
  accountCode: string;
  accountName: string;
  debitMinor: number;
  creditMinor: number;
  txnCurrency: string;
  txnAmountMinor: number;
  functionalCurrency: string;
  functionalAmountMinor: number;
  fxRate: string;
  description: string | null;
}

export interface Journal {
  id: string;
  bookId: string;
  journalNumber: string;
  journalDate: string;
  periodId: string;
  memo: string | null;
  sourceType: GlJournalSource;
  sourceId: string | null;
  idempotencyKey: string;
  reversesJournalId: string | null;
  reversedByJournalId: string | null;
  postedByUserId: string | null;
  postedAt: string;
  totalDebitMinor: number;
  totalCreditMinor: number;
  functionalCurrency: string;
  lines: JournalLine[];
  replayed: boolean;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  accountType: GlAccountType;
  debitMinor: number;
  creditMinor: number;
  balanceMinor: number;
}

export interface TrialBalanceReport {
  asOf: string;
  currency: string;
  rows: TrialBalanceRow[];
  totalDebitMinor: number;
  totalCreditMinor: number;
  balanced: boolean;
}

export interface AccountBalance {
  debitMinor: number;
  creditMinor: number;
  balanceMinor: number;
}

export interface AccountLedgerEntry {
  lineId: string;
  lineNo: number;
  journalId: string;
  journalNumber: string;
  journalDate: string;
  memo: string | null;
  description: string | null;
  debitMinor: number;
  creditMinor: number;
  runningBalanceMinor: number;
  sourceType: GlJournalSource;
  sourceId: string | null;
}

export interface AccountLedger {
  accountId: string;
  code: string;
  name: string;
  accountType: GlAccountType;
  currency: string;
  from: string;
  to: string;
  opening: AccountBalance;
  periodDebitMinor: number;
  periodCreditMinor: number;
  closingBalanceMinor: number;
  entries: AccountLedgerEntry[];
  page: number;
  pageSize: number;
  total: number;
}
