export type AccountingBasis = "ACCRUAL" | "CASH";

export interface PaymentTerm {
  key: string;
  label: string;
  days: number;
  isDefault?: boolean;
}

export interface UpdatePaymentTermsInput {
  terms: PaymentTerm[];
}

export interface AccountingSettings {
  id: number;
  orgId: string;
  baseCurrency: string;
  fiscalYearStartMonth: number;
  accountingBasis: string;
  taxRegistration: unknown;
  coaTemplate: string | null;
  setupCompletedAt: string | null;
  retainedEarningsAccountId: number | null;
  paymentTerms: PaymentTerm[];
  createdAt: string;
  updatedAt: string;
}

export interface SetupStatus {
  steps: Array<{ key: string; label: string; done: boolean }>;
}

export interface NumberSequence {
  id: number | null;
  orgId: string;
  entityType: string;
  prefix: string;
  padding: number;
  nextNumber: number;
  createdAt: string | null;
}

export type SystemAccountPurpose =
  | "AR"
  | "AP"
  | "BANK_CLEARING"
  | "SALES_INCOME"
  | "DISCOUNT_GIVEN"
  | "TAX_PAYABLE"
  | "TAX_RECEIVABLE"
  | "PAYROLL_PAYABLE"
  | "EXPENSE_CLEARING"
  | "RETAINED_EARNINGS"
  | "OWNER_EQUITY"
  | "PAYMENT_FEES"
  | "REIMBURSEMENT_PAYABLE"
  | "FX_GAIN_LOSS"
  | "DEPRECIATION_EXPENSE"
  | "ACCUM_DEPRECIATION"
  | "SALARY_EXPENSE"
  | "ASSET_DISPOSAL_GAIN_LOSS";

export interface SystemAccountMapping {
  purpose: string;
  mapped: boolean;
  accountId: number | null;
  accountCode: string | null;
  accountName: string | null;
  accountType: string | null;
  suggestedAccountId: number | null;
  suggestedAccountCode: string | null;
  suggestedAccountName: string | null;
}

export interface UpdateSettingsInput {
  baseCurrency?: string;
  fiscalYearStartMonth?: number;
  accountingBasis?: AccountingBasis;
  taxRegistration?: Record<string, unknown>;
  coaTemplate?: string;
}

export interface UpdateSequenceInput {
  prefix?: string;
  padding?: number;
  nextNumber?: number;
}

