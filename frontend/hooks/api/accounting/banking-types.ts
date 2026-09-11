export type BankAccountType = "BANK" | "CASH" | "CARD" | "WALLET";
export type BankTxnStatus = "UNMATCHED" | "SUGGESTED" | "MATCHED" | "RECONCILED" | "IGNORED";
export type MatchType =
  | "CUSTOMER_PAYMENT"
  | "VENDOR_PAYMENT"
  | "MANUAL_JOURNAL"
  | "BANK_FEE"
  | "TRANSFER";

export interface BankAccount {
  id: number;
  orgId: string;
  name: string;
  accountType: BankAccountType;
  bankName: string | null;
  accountNumberMasked: string | null;
  ifsc: string | null;
  currency: string;
  ledgerAccountId: number | null;
  openingBalance: string;
  openingBalanceDate: string | null;
  currentBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: number;
  bankAccountId: number;
  txnDate: string;
  description: string;
  reference: string | null;
  counterparty: string | null;
  amount: string;
  status: BankTxnStatus;
  matchType: MatchType | null;
  matchedRecordId: number | null;
  createdAt: string;
}

export interface ReconciliationSuggestedMatch {
  id: number;
  bankTransactionId: number;
  journalEntryId: number | null;
  matchedType: MatchType;
  matchedRecordId: number | null;
  amount: string;
  confidence: string;
  isConfirmed: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

export interface ReconciliationTxn extends BankTransaction {
  suggestedMatches?: ReconciliationSuggestedMatch[];
}

export interface ReconciliationWorkspace {
  unmatched: ReconciliationTxn[];
  suggested: ReconciliationTxn[];
  reconciledCount: number;
  ledgerBalance: string;
  bankBalance: string;
}

export interface ReconciliationRuleCondition {
  field: "description" | "counterparty" | "amount";
  op: "contains" | "equals" | "gt" | "lt";
  value: string;
}

export interface ReconciliationRuleAction {
  type: "categorize" | "transfer" | "fee";
  counterAccountId?: number;
  memo?: string;
}

export interface ReconciliationRule {
  id: number;
  bankAccountId: number;
  name: string;
  priority: number;
  conditions: ReconciliationRuleCondition[];
  action: ReconciliationRuleAction;
  isActive: boolean;
  createdAt: string;
}

export interface BankTransfer {
  id: number;
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: string;
  transferDate: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

export interface BankImport {
  id: number;
  orgId: string;
  bankAccountId: number;
  fileName: string;
  importedCount: number;
  duplicateCount: number;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface BankImportResult {
  importedCount: number;
  duplicateCount: number;
  errors: string[];
}
