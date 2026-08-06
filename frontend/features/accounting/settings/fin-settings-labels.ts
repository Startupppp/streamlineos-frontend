import type { SystemAccountPurpose } from "@/types/accounting/fin-settings";

export const PURPOSE_LABELS: Record<SystemAccountPurpose, string> = {
  AR: "Accounts Receivable",
  AP: "Accounts Payable",
  BANK_CLEARING: "Bank Clearing",
  SALES_INCOME: "Sales Income",
  DISCOUNT_GIVEN: "Discount Given",
  TAX_PAYABLE: "Tax Payable",
  TAX_RECEIVABLE: "Tax Receivable",
  PAYROLL_PAYABLE: "Payroll Payable",
  EXPENSE_CLEARING: "Expense Clearing",
  RETAINED_EARNINGS: "Retained Earnings",
  OWNER_EQUITY: "Owner Equity",
  PAYMENT_FEES: "Payment Fees",
  REIMBURSEMENT_PAYABLE: "Reimbursement Payable",
  FX_GAIN_LOSS: "FX Gain / Loss",
  DEPRECIATION_EXPENSE: "Depreciation Expense",
  ACCUM_DEPRECIATION: "Accumulated Depreciation",
  SALARY_EXPENSE: "Salary Expense",
  ASSET_DISPOSAL_GAIN_LOSS: "Asset Disposal Gain / Loss",
};
