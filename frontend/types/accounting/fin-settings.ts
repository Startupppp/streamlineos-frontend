export type AccountingBasis = "ACCRUAL" | "CASH";

export type SequenceEntityType =
  | "journal"
  | "invoice"
  | "credit_note"
  | "bill"
  | "vendor_credit"
  | "payment"
  | "asset";

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
  accountingBasis: AccountingBasis;
  taxRegistration: Record<string, unknown> | null;
  coaTemplate: string | null;
  paymentTerms?: PaymentTerm[];
  createdAt: string;
  updatedAt: string;
}

export interface SetupStatus {
  steps: Array<{ key: string; label: string; done: boolean }>;
}

export interface NumberSequence {
  id: number | null;
  orgId: string;
  entityType: SequenceEntityType;
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
  purpose: SystemAccountPurpose;
  accountId: number | null;
  account: {
    id: number;
    code: string;
    name: string;
    accountType: string;
  } | null;
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

