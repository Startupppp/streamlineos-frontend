import type { GlAccountType, GlJournalSource, GlSystemTag, AccountingBook } from "./accounting-kernel";

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

/**
 * Whether this organisation's accounting can actually receive a posting.
 *
 * `unprovisioned` is the state the UI could not previously show: the accounting
 * module is switched on and no book exists, so every posting from inventory,
 * payroll and billing is accepted and recorded nowhere. It looked exactly like
 * an organisation that had opted out.
 */
export type AccountingProvisioning =
  | { state: "not_requested" }
  | { state: "unprovisioned"; message: string }
  | {
      state: "incomplete";
      bookId: string;
      missingRoles: GlSystemTag[];
      message: string;
    }
  /**
   * The books run out on a date. AP self-heals by creating the next year on
   * demand; AR and the inventory bridge reject instead, so this warns 30 days
   * before a tenant stops being able to receive goods.
   */
  | {
      state: "fiscal_year_ending";
      bookId: string;
      endsOn: string;
      daysRemaining: number;
      message: string;
    }
  | { state: "ready"; bookId: string };

export interface AccountingSetupStatusDisabled {
  enabled: false;
  provisioning: AccountingProvisioning;
}

export interface AccountingSetupStatusEnabled {
  enabled: true;
  book: AccountingBook;
  packStatus: "enabled" | "stub";
  accounts: number;
  taxCodes: number;
  taxRegistrations: number;
  provisioning: AccountingProvisioning;
  nextSteps: string[];
}

/**
 * One system role and the account filling it. The API returns every role,
 * mapped or not — a list that omitted the unmapped would show an operator
 * nothing to do, which is the only reason to open this screen.
 */
export interface AccountSystemTagMapping {
  tag: GlSystemTag;
  allowedAccountTypes: GlAccountType[];
  account: {
    id: string;
    code: string;
    name: string;
    accountType: GlAccountType;
  } | null;
  /** Inventory refuses a movement without this one, today. */
  requiredByInventory: boolean;
  /** Seeded by the chart and resolved by no call site yet. */
  awaitingInventorySupport: boolean;
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

export interface EnableAccountingInput {
  countryCode: string;
  baseCurrency?: string;
  packCode?: string;
  name?: string;
  legalEntityId?: string;
  openFrom?: string;
}

export interface CreateAccountInput {
  code: string;
  name: string;
  accountType: GlAccountType;
  parentAccountId?: string | null;
  isHeader?: boolean;
  isCash?: boolean;
  systemTag?: GlSystemTag | null;
  currencyRestriction?: string | null;
  description?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  parentAccountId?: string | null;
  isActive?: boolean;
  isCash?: boolean;
  currencyRestriction?: string | null;
  description?: string | null;
}

export interface PostJournalLineInput {
  accountId: string;
  debitMinor?: number;
  creditMinor?: number;
  txnCurrency?: string;
  txnAmountMinor?: number;
  fxRate?: string;
  partyId?: string;
  description?: string;
  dimensionProjectId?: number;
  dimensionBranchId?: string;
}

export interface PostJournalInput {
  idempotencyKey: string;
  journalDate: string;
  memo?: string;
  sourceType?: GlJournalSource;
  sourceId?: string;
  lines: PostJournalLineInput[];
}

export interface OpeningBalanceLineInput {
  accountId: string;
  amountMinor: number;
}

export interface OpeningBalancesInput {
  asOfDate: string;
  lines: OpeningBalanceLineInput[];
  memo?: string;
}

export interface OpeningBalancesPreview {
  asOfDate: string;
  journalDate: string;
  totalDebitMinor: number;
  totalCreditMinor: number;
  differenceMinor: number;
  balancingAccountCode: string | null;
  currency: string;
  alreadyPosted: boolean;
}
