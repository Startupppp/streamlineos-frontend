import type { GlAccountType } from "./accounting-kernel";

export type LabelMode = "founder" | "accountant";

export interface FiscalYearWindow {
  name: string;
  startsOn: string;
  endsOn: string;
  opened: boolean;
}

export interface ReportRangeParams {
  from: string;
  to: string;
  labelMode?: LabelMode;
}

export interface ReportAsOfParams {
  asOf: string;
  labelMode?: LabelMode;
}

export interface TrialBalanceParams extends ReportAsOfParams {
  includeZeroActivity?: boolean;
}

export interface TrialBalanceLine {
  accountId: string;
  code: string;
  name: string;
  accountType: GlAccountType;
  accountTypeLabel: string;
  debitMinor: number;
  creditMinor: number;
  movementDebitMinor: number;
  movementCreditMinor: number;
}

export interface TrialBalanceStatement {
  reportKey: "trial_balance";
  title: string;
  labelMode: LabelMode;
  bookId: string;
  currency: string;
  asOf: string;
  includeZeroActivity: boolean;
  columns: { account: string; debit: string; credit: string };
  lines: TrialBalanceLine[];
  totalDebitMinor: number;
  totalCreditMinor: number;
  balanced: boolean;
  differenceMinor: number;
}

export interface ProfitLossParams extends ReportRangeParams {
  comparative?: boolean;
  clampToFiscalYear?: boolean;
  includeZeroActivity?: boolean;
}

export interface ProfitLossLine {
  accountId: string;
  code: string;
  name: string;
  accountType: GlAccountType;
  amountMinor: number;
  priorAmountMinor: number | null;
  varianceMinor: number | null;
}

export interface ProfitLossSection {
  key: "income" | "expense";
  label: string;
  lines: ProfitLossLine[];
  totalMinor: number;
  priorTotalMinor: number | null;
}

export interface ProfitLossReport {
  reportKey: "profit_loss";
  title: string;
  labelMode: LabelMode;
  bookId: string;
  currency: string;
  requestedFrom: string;
  from: string;
  to: string;
  fiscalYear: FiscalYearWindow;
  clampedToFiscalYear: boolean;
  comparative: { from: string; to: string } | null;
  columns: { account: string; thisPeriod: string; lastPeriod: string; change: string };
  income: ProfitLossSection;
  expense: ProfitLossSection;
  netProfitLabel: string;
  netProfitMinor: number;
  priorNetProfitMinor: number | null;
  notes: string[];
}

export type BalanceSheetComputedTag = "current_year_earnings" | "prior_year_earnings";

export interface BalanceSheetParams extends ReportAsOfParams {
  includeZeroActivity?: boolean;
}

export interface BalanceSheetLine {
  accountId: string | null;
  code: string | null;
  name: string;
  accountType: GlAccountType | null;
  computed: boolean;
  tag: BalanceSheetComputedTag | null;
  amountMinor: number;
  isContra: boolean;
}

export interface BalanceSheetSection {
  key: "assets" | "liabilities" | "equity";
  label: string;
  lines: BalanceSheetLine[];
  totalMinor: number;
}

export interface BalanceSheetReport {
  reportKey: "balance_sheet";
  title: string;
  labelMode: LabelMode;
  bookId: string;
  currency: string;
  asOf: string;
  fiscalYear: FiscalYearWindow;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssetsMinor: number;
  totalLiabilitiesMinor: number;
  totalEquityMinor: number;
  liabilitiesAndEquityMinor: number;
  currentYearEarningsMinor: number;
  priorYearEarningsMinor: number;
  balanced: boolean;
  differenceMinor: number;
  notes: string[];
}

export interface CashFlowLine {
  key: string;
  label: string;
  amountMinor: number;
  accountCodes: string[];
}

export interface CashFlowSection {
  key: "operating" | "non_cash" | "working_capital" | "unmodelled";
  label: string;
  lines: CashFlowLine[];
  totalMinor: number;
}

export interface CashFlowReport {
  reportKey: "cash_flow";
  title: string;
  method: "indirect";
  labelMode: LabelMode;
  bookId: string;
  currency: string;
  from: string;
  to: string;
  sections: CashFlowSection[];
  netIncomeMinor: number;
  nonCashMinor: number;
  workingCapitalMinor: number;
  operatingCashMinor: number;
  otherMovementsMinor: number;
  openingCashMinor: number;
  netMovementMinor: number;
  closingCashMinor: number;
  reconciles: boolean;
  reconciliationDifferenceMinor: number;
  limitations: string[];
}

export type AgingSide = "ar" | "ap";
export type AgingBasis = "due" | "issue";
export type AgingBucketKey = "0-30" | "31-60" | "61-90" | "91+";
export type AgingBuckets = Record<AgingBucketKey, number>;

export const AGING_BUCKET_KEYS: readonly AgingBucketKey[] = [
  "0-30",
  "31-60",
  "61-90",
  "91+",
];

export interface AgingParams extends ReportAsOfParams {
  side: AgingSide;
  basis?: AgingBasis;
  includeDocuments?: boolean;
}

export interface AgingPartyRow {
  partyId: string;
  partyName: string;
  buckets: AgingBuckets;
  totalMinor: number;
  documentCount: number;
  oldestAgeDays: number;
}

export interface AgingDocumentRow {
  documentId: string;
  documentNumber: string | null;
  documentType: string;
  partyId: string;
  partyName: string;
  issueDate: string;
  dueDate: string | null;
  basisDate: string;
  ageDays: number;
  bucket: AgingBucketKey;
  currency: string;
  openMinor: number;
  functionalOpenMinor: number;
}

export interface AgingReport {
  reportKey: "aging";
  side: AgingSide;
  title: string;
  labelMode: LabelMode;
  bookId: string;
  currency: string;
  asOf: string;
  basis: AgingBasis;
  bucketLabels: Record<AgingBucketKey, string>;
  parties: AgingPartyRow[];
  totals: AgingBuckets;
  totalOpenMinor: number;
  documents: AgingDocumentRow[] | null;
  documentsTruncated: boolean;
  controlAccountCode: string | null;
  controlAccountBalanceMinor: number;
  differenceMinor: number;
  reconciles: boolean;
  notes: string[];
}

export type TaxGlRole =
  | "output_payable"
  | "input_recoverable"
  | "reverse_charge_output"
  | "reverse_charge_input"
  | "blocked_input"
  | "withheld";

export interface TaxSummaryRow {
  glRole: TaxGlRole;
  glRoleLabel: string;
  component: string;
  jurisdiction: string;
  rateBp: number;
  currency: string;
  taxableMinor: number;
  taxMinor: number;
  documentCount: number;
}

export interface TaxSummaryCurrencyTotals {
  currency: string;
  taxableMinor: number;
  taxMinor: number;
  outputTaxMinor: number;
  recoverableInputTaxMinor: number;
  blockedInputTaxMinor: number;
  withheldTaxMinor: number;
  netPayableMinor: number;
}

export interface TaxSummaryReport {
  reportKey: "tax_summary";
  title: string;
  labelMode: LabelMode;
  bookId: string;
  currency: string;
  from: string;
  to: string;
  rows: TaxSummaryRow[];
  byRole: Array<{ glRole: TaxGlRole; label: string; taxableMinor: number; taxMinor: number }>;
  byComponent: Array<{ component: string; taxableMinor: number; taxMinor: number }>;
  byCurrency: TaxSummaryCurrencyTotals[];
  totals: TaxSummaryCurrencyTotals;
  notes: string[];
}

export type ReportKey =
  | "trial-balance"
  | "pnl"
  | "balance-sheet"
  | "cash-flow"
  | "aging"
  | "tax-summary";
