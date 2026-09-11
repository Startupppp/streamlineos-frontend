import type { BankAccountType as BankAccountTypeValue } from "@/hooks/api/accounting/banking-schema";

export type { BankAccountType } from "@/hooks/api/accounting/banking-schema";
export type { BankAccountRecord as BankAccount } from "@/hooks/api/accounting/banking-schema";

export type BankTxnStatus = "UNMATCHED" | "SUGGESTED" | "MATCHED" | "RECONCILED" | "IGNORED";
export type MatchType =
  | "CUSTOMER_PAYMENT"
  | "VENDOR_PAYMENT"
  | "MANUAL_JOURNAL"
  | "BANK_FEE"
  | "TRANSFER";

export interface BankTransaction {
  id: number;
  orgId: string;
  bankAccountId: number;
  importId: number | null;
  txnDate: string;
  description: string | null;
  reference: string | null;
  counterparty: string | null;
  amount: string;
  balanceAfter: string | null;
  fingerprint: string;
  status: BankTxnStatus;
  matchedJournalEntryId: number | null;
  createdAt: string;
}

export interface ReconciliationSuggestedMatch {
  id: number;
  orgId: string;
  bankTransactionId: number;
  journalEntryId: number | null;
  matchedType: string;
  matchedRecordId: number | null;
  amount: string;
  confidence: string | null;
  isConfirmed: boolean;
  confirmedByMembershipId: number | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface ReconciliationTxn extends BankTransaction {
  suggestedMatches?: ReconciliationSuggestedMatch[];
}

export interface ReconciliationWorkspace {
  unmatched: ReconciliationTxn[];
  suggested: ReconciliationTxn[];
  reconciledCount: number;
  ledgerBalance: string | null;
  bankBalance: string;
}

export interface ReconciliationRuleCondition {
  field: "description" | "counterparty" | "amount";
  op: "contains" | "equals" | "gt" | "lt";
  value: string;
}

export type ReconciliationRuleAction =
  | { type: "categorize"; accountPurposeOrId: string | number; memo?: string }
  | { type: "transfer" }
  | { type: "fee" };

export interface ReconciliationRule {
  id: number;
  orgId: string;
  name: string;
  priority: number;
  conditions: ReconciliationRuleCondition[];
  action: ReconciliationRuleAction;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransfer {
  id: number;
  orgId: string;
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: string;
  transferDate: string;
  reference: string | null;
  journalEntryId: number | null;
  createdByMembershipId: number | null;
  createdAt: string;
}

export interface BankImportResult {
  id: number;
  importedCount: number;
  duplicateCount: number;
  totalRows: number;
}

export interface ListBankAccountsParams {
  cursor?: string;
  limit?: number;
}

export interface ListTxnParams {
  status?: BankTxnStatus;
  from?: string;
  to?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateBankAccountInput {
  name: string;
  accountType: BankAccountTypeValue;
  bankName?: string;
  accountNumberMasked?: string;
  ifsc?: string;
  currency: string;
  ledgerAccountId?: number;
  openingBalance: string;
  openingBalanceDate?: string;
}

export interface CreateBankImportInput {
  bankAccountId: number;
  fileName: string;
  columnMapping: {
    date: string;
    description: string;
    amount?: string;
    debit?: string;
    credit?: string;
    reference?: string;
    counterparty?: string;
  };
  rows: string[][];
  dateFormat: string;
  hasHeaderRow: boolean;
}

export interface ConfirmMatchInput {
  transactionId: number;
  matchType: MatchType;
  matchedRecordId?: number;
  counterAccountId?: number;
  memo?: string;
}

export interface UnmatchInput {
  transactionId: number;
}

export interface IgnoreInput {
  transactionId: number;
}

export interface OptimisticContext {
  snapshot: ReconciliationWorkspace | undefined;
}

export interface ListRulesParams {
  cursor?: string;
  limit?: number;
}

export interface CreateRuleInput {
  name: string;
  priority: number;
  conditions: ReconciliationRuleCondition[];
  action: ReconciliationRuleAction;
  isActive: boolean;
}

export interface ListTransfersParams {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
}

export interface CreateTransferInput {
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: string;
  transferDate: string;
  reference?: string;
  description?: string;
}
