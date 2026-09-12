export type BankIdentifierScheme =
  | "IFSC_ACCOUNT"
  | "IBAN"
  | "ROUTING_ACCOUNT"
  | "SORT_ACCOUNT"
  | "BSB_ACCOUNT"
  | "UPI"
  | "OTHER";

export const STATEMENT_DATE_FORMATS = [
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "DD-MM-YYYY",
  "MM-DD-YYYY",
  "DD.MM.YYYY",
  "DD-MMM-YYYY",
  "MMM DD, YYYY",
] as const;

export type StatementDateFormat = (typeof STATEMENT_DATE_FORMATS)[number];

export type DecimalSeparator = "." | ",";

export interface CsvColumnMapping {
  dateColumn?: string;
  descriptionColumn?: string;
  referenceColumn?: string;
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  dateFormat?: StatementDateFormat;
  skipRows?: number;
  delimiter?: string;
  decimalSeparator?: DecimalSeparator;
}

export interface StatementMappingPreset {
  code: string;
  label: string;
  description: string;
  mapping: CsvColumnMapping;
}

export interface BankAccountSummary {
  id: string;
  bookId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  displayName: string;
  bankName: string | null;
  currency: string;
  countryCode: string;
  identifierScheme: BankIdentifierScheme | null;
  identifierValue: string | null;
  branchIdentifier: string | null;
  csvMapping: CsvColumnMapping | null;
  isActive: boolean;
}

export interface BankAccountPage {
  items: BankAccountSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface BankAccountBalance {
  bankProfileId: string;
  accountId: string;
  asOf: string;
  functionalCurrency: string;
  functionalBalanceMinor: number;
  currency: string;
  balanceMinor: number;
}

export interface CreateBankAccountInput {
  accountId: string;
  displayName: string;
  bankName?: string;
  currency?: string;
  countryCode?: string;
  identifierScheme?: BankIdentifierScheme;
  identifierValue?: string;
  branchIdentifier?: string;
  csvMappingPreset?: string;
  csvMapping?: CsvColumnMapping;
  isActive?: boolean;
}

export interface UpdateBankAccountInput {
  displayName?: string;
  bankName?: string | null;
  countryCode?: string;
  identifierScheme?: BankIdentifierScheme | null;
  identifierValue?: string | null;
  branchIdentifier?: string | null;
  isActive?: boolean;
}

export interface SaveCsvMappingInput {
  preset?: string;
  mapping?: CsvColumnMapping;
}

export interface ListBankAccountsParams {
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface StatementLine {
  id: string;
  lineNo: number;
  valueDate: string;
  amountMinor: number;
  description: string | null;
  bankReference: string | null;
}

export interface StatementSummary {
  id: string;
  bankProfileId: string;
  bookId: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  openingMinor: number;
  closingMinor: number;
  source: "csv" | "manual" | "feed";
  fileName: string | null;
  fileHash: string | null;
  lineCount: number;
  reconciledAt: string | null;
  reconciledBy: string | null;
  importedAt: string;
}

export interface StatementDetail extends StatementSummary {
  lines: StatementLine[];
  page: number;
  pageSize: number;
}

export interface StatementPage {
  items: StatementSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface StatementImportWarning {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface StatementImportResult {
  statementId: string;
  bankProfileId: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  openingMinor: number;
  closingMinor: number;
  movementMinor: number;
  lineCount: number;
  fileHash: string;
  warnings: StatementImportWarning[];
  lines: StatementLine[];
}

export interface ImportStatementInput {
  bankProfileId: string;
  content: string;
  fileName?: string;
  presetCode?: string;
  mapping?: CsvColumnMapping;
  periodStart: string;
  periodEnd: string;
  opening: string;
  closing: string;
}

export type MatchKind = "receipt" | "payment" | "journal";

export interface StatementLineContext {
  id: string;
  statementId: string;
  lineNo: number;
  valueDate: string;
  amountMinor: number;
  description: string | null;
  bankReference: string | null;
  profile: BankAccountSummary;
  periodStart: string;
  periodEnd: string;
}

export interface MatchSuggestion {
  kind: MatchKind;
  id: string;
  label: string;
  date: string;
  amountMinor: number;
  currency: string;
  reference: string | null;
  score: number;
  reasons: string[];
}

export interface MatchSuggestionsResponse {
  line: StatementLineContext;
  suggestions: MatchSuggestion[];
}

export interface RecordedMatch {
  id: string;
  statementLineId: string;
  kind: MatchKind;
  counterpartId: string;
  amountMinor: number;
  currency: string;
  matchedAt: string;
}

export interface UnreconciledGlLine {
  journalId: string;
  journalNumber: string;
  journalDate: string;
  lineId: string;
  lineNo: number;
  accountId: string;
  amountMinor: number;
  txnCurrency: string;
  functionalAmountMinor: number;
  memo: string | null;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
}

export interface UnreconciledStatementLine {
  id: string;
  statementId: string;
  lineNo: number;
  valueDate: string;
  amountMinor: number;
  description: string | null;
  bankReference: string | null;
}

export interface UnreconciledView {
  bookId: string;
  accountId: string;
  bankProfileId: string;
  currency: string;
  asOf: string;
  statementLines: UnreconciledStatementLine[];
  statementLinesTotalMinor: number;
  glLines: UnreconciledGlLine[];
  glLinesTotalMinor: number;
  page: number;
  pageSize: number;
}

export interface UnreconciledParams {
  accountId: string;
  asOf: string;
  page?: number;
  pageSize?: number;
}

export interface ReconciliationProof {
  statementId: string;
  bankProfileId: string;
  bookId: string;
  accountId: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  glBalanceMinor: number;
  statementClosingMinor: number;
  unmatchedGlMinor: number;
  unmatchedGlLines: UnreconciledGlLine[];
  unmatchedStatementMinor: number;
  unmatchedStatementLines: UnreconciledStatementLine[];
  adjustedGlMinor: number;
  adjustedStatementMinor: number;
  differenceMinor: number;
  holds: boolean;
  openingVarianceMinor: number;
  openingGlMinor: number;
  statementOpeningMinor: number;
  priorUnmatchedGlMinor: number;
  functionalCurrency: string;
  glBalanceFunctionalMinor: number;
  explanation: string;
  reconciledAt: string | null;
  reconciledBy: string | null;
}
