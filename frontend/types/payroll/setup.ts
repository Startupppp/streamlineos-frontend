import type { DB_ENUMS } from "@/contracts/db-enums.generated";
import type {
  PreviewLine,
  TemplatePreviewResult,
  PolicyPreviewComponent,
  PolicyPreviewResult,
  StatutoryPackItem,
  StatutoryPackPreview,
} from "@/hooks/api/payroll/setup-preview-schema";

export const TOGGLE_KEYS = [
  "pf",
  "esi",
  "professionalTax",
  "tds",
  "gratuity",
  "lwf",
  "lopFromAttendance",
  "overtime",
  "timesheets",
  "leaveSync",
  "expenseSync",
  "salesIncentives",
  "manualAdjustments",
  "reimbursements",
  "bonuses",
  "incentives",
  "loans",
  "contractorPayments",
  "multiCurrency",
  "employeeDeclarations",
  "payrollVarianceWarnings",
  "requireLockedPayrollInputs",
  "countryComplianceChecklist",
  "globalPaymentReport",
  "bankPayoutFile",
  "payslipPublishing",
  "emailPayslips",
  "approvalWorkflow",
  "managerApproval",
  "financeApproval",
  "lockAfterApproval",
  "essShowSalaryStructure",
  "essAllowBankUpdate",
  "essAllowLoanRequests",
  "essAllowTaxDeclarations",
  "essAllowReimbursements",
] as const;

export type ToggleKey = (typeof TOGGLE_KEYS)[number];

export type ComponentType =
  | "EARNING"
  | "DEDUCTION"
  | "EMPLOYER_CONTRIBUTION"
  | "REIMBURSEMENT"
  | "TAX"
  | "ADJUSTMENT";

export type CalcMethod =
  | "FIXED"
  | "PERCENT_OF_BASIC"
  | "PERCENT_OF_GROSS"
  | "FORMULA"
  | "ATTENDANCE_BASED"
  | "TIMESHEET_BASED"
  | "MANUAL";

export type Complexity = "SIMPLE" | "MODERATE" | "ADVANCED";

export const PAY_FREQUENCIES = [
  "MONTHLY",
  "SEMI_MONTHLY",
  "BI_WEEKLY",
  "WEEKLY",
] as const;

export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export type PolicyStatus = "DRAFT" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED";

export type ComponentDef = {
  code: string;
  name: string;
  type: ComponentType;
  calcMethod: CalcMethod;
};

export type TemplateRow = {
  id: number;
  orgId: string | null;
  key: string | null;
  name: string;
  description: string;
  bestFor: string;
  complexity: Complexity;
  badge: string | null;
  category: string;
  defaultToggles: Record<ToggleKey, boolean>;
  defaultComponents: ComponentDef[];
  isSystem: boolean;
  isRecommended: boolean;
  createdAt: string;
  updatedAt: string;
};

export type {
  PreviewLine,
  TemplatePreviewResult,
  PolicyPreviewComponent,
  PolicyPreviewResult,
  StatutoryPackItem,
  StatutoryPackPreview,
};

export type PolicyRow = {
  id: number;
  status: PolicyStatus;
  country: string;
  state: string | null;
  legalEntityName: string | null;
  currency: string;
  payFrequency: PayFrequency;
  payDay: number;
  startMonth: string;
  activeVersionId: number | null;
};

export type ComponentPayCategory =
  (typeof DB_ENUMS.salary_component_pay_category)[number];

export type SalaryComponent = {
  id: number;
  code: string;
  name: string;
  type: ComponentType;
  payCategory: ComponentPayCategory;
  calcMethod: CalcMethod;
  amount: string | null;
  percent: string | null;
  formula: string | null;
  taxable: boolean;
  showOnPayslip: boolean;
  includeInCtc: boolean;
  isStatutory: boolean;
  statutoryKey: string | null;
  sortOrder: number;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};
