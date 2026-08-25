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
  | "inventory";

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

export interface Currency {
  code: string;
  name: string;
  minorUnits: number;
  symbol: string | null;
}

export interface BookCurrency {
  currencyCode: string;
  isBase: boolean;
  minorUnits: number;
  name: string;
  symbol: string | null;
}

export interface FxRate {
  id: string;
  fromCode: string;
  toCode: string;
  rateDate: string;
  rate: string;
  source: string;
  capturedAt: string;
}

export interface FxPreview {
  from: { currency: string; amountMinor: number; display: string; minorUnits: number };
  to: { currency: string; amountMinor: number; display: string; minorUnits: number };
  rate: string;
  rateDate: string;
  rateId: string | null;
}

export type TaxRegime =
  | "GST_IN"
  | "VAT_EU"
  | "VAT_GB"
  | "VAT_GCC"
  | "GST_SG"
  | "GST_AU"
  | "GST_HST_CA"
  | "SALES_TAX_US"
  | "PAN_IN"
  | "TAN_IN"
  | "EIN_US"
  | "GENERIC";

export interface TaxRegistration {
  id: string;
  regime: TaxRegime;
  number: string;
  region: string | null;
  countryCode: string;
  isPrimary: boolean;
}

export interface AccountingSetupStatusDisabled {
  enabled: false;
}

export interface AccountingSetupStatusEnabled {
  enabled: true;
  book: AccountingBook;
  packStatus: "enabled" | "stub";
  accounts: number;
  taxCodes: number;
  taxRegistrations: number;
  nextSteps: string[];
}

export type AccountingSetupStatus =
  | AccountingSetupStatusDisabled
  | AccountingSetupStatusEnabled;

export interface EnableAccountingResult {
  bookId: string;
  name: string;
  countryCode: string;
  baseCurrency: string;
  localizationPack: string;
  packStatus: "enabled" | "stub";
  fiscalYear: { id: string; name: string; startsOn: string; endsOn: string };
  accountsSeeded: number;
  taxCodesSeeded: number;
  nextSteps: string[];
}

export type LedgerRejectionCode =
  | "EMPTY_JOURNAL"
  | "UNBALANCED"
  | "LINE_SIDE_INVALID"
  | "LINE_AMOUNT_INVALID"
  | "CURRENCY_INVALID"
  | "FX_RATE_INVALID"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_IS_HEADER"
  | "ACCOUNT_INACTIVE"
  | "ACCOUNT_CURRENCY_RESTRICTED"
  | "PERIOD_NOT_FOUND"
  | "PERIOD_LOCKED"
  | "BOOK_NOT_FOUND"
  | "JOURNAL_NOT_FOUND"
  | "ALREADY_REVERSED"
  | "IDEMPOTENCY_CONFLICT";
