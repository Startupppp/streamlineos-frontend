export const PAYROLL_RUN_STATUSES = [
  "PREPARING",
  "DRAFT",
  "PREVIEW_READY",
  "EXCEPTIONS_FOUND",
  "PENDING_APPROVAL",
  "APPROVED",
  "LOCKED",
  "PAID",
  "PAYSLIPS_PUBLISHED",
  "CLOSED",
  "REOPENED",
] as const;
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

export const PAYROLL_WORKER_TYPES = [
  "EMPLOYEE",
  "CONTRACTOR",
  "CONSULTANT",
  "INTERN",
  "EOR",
] as const;
export type PayrollWorkerType = (typeof PAYROLL_WORKER_TYPES)[number];

export const SALARY_COMPONENT_TYPES = [
  "EARNING",
  "DEDUCTION",
  "EMPLOYER_CONTRIBUTION",
  "REIMBURSEMENT",
  "TAX",
  "ADJUSTMENT",
] as const;
export type SalaryComponentType = (typeof SALARY_COMPONENT_TYPES)[number];

export const SALARY_COMPONENT_CALC_METHODS = [
  "FIXED",
  "PERCENT_OF_BASIC",
  "PERCENT_OF_GROSS",
  "FORMULA",
  "ATTENDANCE_BASED",
  "TIMESHEET_BASED",
  "MANUAL",
] as const;
export type SalaryComponentCalcMethod = (typeof SALARY_COMPONENT_CALC_METHODS)[number];

export const PAYROLL_EXCEPTION_SEVERITIES = [
  "BLOCKER",
  "WARNING",
  "INFO",
] as const;
export type PayrollExceptionSeverity = (typeof PAYROLL_EXCEPTION_SEVERITIES)[number];

export const PAYROLL_EXCEPTION_STATUSES = [
  "OPEN",
  "RESOLVED",
  "OVERRIDDEN",
] as const;
export type PayrollExceptionStatus = (typeof PAYROLL_EXCEPTION_STATUSES)[number];

export const PAYROLL_APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type PayrollApprovalStatus = (typeof PAYROLL_APPROVAL_STATUSES)[number];

export const PAYROLL_BANK_BATCH_STATUSES = [
  "DRAFT",
  "GENERATED",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "FAILED",
] as const;
export type PayrollBankBatchStatus = (typeof PAYROLL_BANK_BATCH_STATUSES)[number];

export const PAYROLL_BANK_ITEM_STATUSES = [
  "PENDING",
  "SENT",
  "PAID",
  "FAILED",
  "HELD",
] as const;
export type PayrollBankItemStatus = (typeof PAYROLL_BANK_ITEM_STATUSES)[number];

export const PAYROLL_POLICY_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "SUPERSEDED",
  "ARCHIVED",
] as const;
export type PayrollPolicyStatus = (typeof PAYROLL_POLICY_STATUSES)[number];

export const SALARY_PROFILE_STATUSES = [
  "UPCOMING",
  "ACTIVE",
  "SUPERSEDED",
] as const;
export type SalaryProfileStatus = (typeof SALARY_PROFILE_STATUSES)[number];

export const PAY_FREQUENCIES = [
  "MONTHLY",
  "SEMI_MONTHLY",
  "BI_WEEKLY",
  "WEEKLY",
] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export const TAX_REGIME_TYPES = [
  "OLD",
  "NEW",
] as const;
export type TaxRegimeType = (typeof TAX_REGIME_TYPES)[number];

export const PAYSLIP_LAYOUTS = [
  "CLASSIC",
  "MODERN",
  "COMPLIANCE",
] as const;
export type PayslipLayout = (typeof PAYSLIP_LAYOUTS)[number];

export const PAYSLIP_PUBLISH_CHANNELS = [
  "PORTAL",
  "EMAIL",
] as const;
export type PayslipPublishChannel = (typeof PAYSLIP_PUBLISH_CHANNELS)[number];

export const PAYROLL_CALENDAR_EVENT_TYPES = [
  "ATTENDANCE_CUTOFF",
  "REIMBURSEMENT_CUTOFF",
  "DECLARATION_CUTOFF",
  "PREVIEW_DUE",
  "APPROVAL_DEADLINE",
  "PAY_DATE",
  "PUBLISH_DATE",
] as const;
export type PayrollCalendarEventType = (typeof PAYROLL_CALENDAR_EVENT_TYPES)[number];

export const PAYROLL_LOAN_ADJUSTMENT_TYPES = [
  "SKIP_EMI",
  "EXTRA_RECOVERY",
  "FORECLOSURE",
  "MANUAL_ADJUST",
] as const;
export type PayrollLoanAdjustmentType = (typeof PAYROLL_LOAN_ADJUSTMENT_TYPES)[number];
