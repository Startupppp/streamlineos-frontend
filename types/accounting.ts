export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export interface Account {
  id: number;
  orgId: string;
  code: string;
  name: string;
  accountType: AccountType;
  parentAccountId: number | null;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalLine {
  id: number;
  entryId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  description: string | null;
  lineOrder: number;
}

export type JournalEntryStatus = "DRAFT" | "POSTED" | "VOID";

export interface JournalEntry {
  id: number;
  orgId: string;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  sourceEvent: string | null;
  status: JournalEntryStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lines?: JournalLine[];
}

export interface TrialBalanceRow {
  accountId: number;
  code: string;
  name: string;
  accountType: AccountType;
  debit: string;
  credit: string;
  balance: string;
}

export interface ProfitLossRow {
  accountId: number;
  code: string;
  name: string;
  accountType: "INCOME" | "EXPENSE";
  amount: string;
}

export interface ProfitLossReport {
  from: string;
  to: string;
  income: ProfitLossRow[];
  expense: ProfitLossRow[];
  totalIncome: string;
  totalExpense: string;
  netIncome: string;
}
