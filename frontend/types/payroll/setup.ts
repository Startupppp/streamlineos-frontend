/**
 * Every preview shape is inferred from the runtime contract that parses it, so a type here can
 * never disagree with what the seam accepts.
 */
import type {
  PreviewLine,
  TemplatePreviewResult,
  PolicyPreviewComponent,
  PolicyPreviewResult,
  ComplianceChecklistItem,
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

export type VersionStatus = "DRAFT" | "ACTIVE" | "SUPERSEDED";

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
  ComplianceChecklistItem,
  StatutoryPackItem,
  StatutoryPackPreview,
};

export type PolicyConfig = {
  statutory?: Record<string, unknown>;
  [key: string]: unknown;
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

export type VersionRow = {
  id: number;
  version: number;
  templateKey: string;
  toggles: Record<ToggleKey, boolean>;
  config: PolicyConfig;
  status: VersionStatus;
  effectiveFrom: string;
  reason: string;
};

export type StatutoryPackConfig = {
  country: string;
  items: { key: string; enabled: boolean; percentOverride?: number; label?: string; kind?: string | null }[];
  complianceChecklist: ComplianceChecklistItem[];
};

export type PolicyCurrentResult = {
  policy: PolicyRow | null;
  activeVersion: VersionRow | null;
  taxRegimeApplicable: boolean;
  statutoryPack: StatutoryPackConfig | null;
};

export type ToggleImpactResult = {
  toggle: ToggleKey;
  affectedEmployeeCount: number;
  affectedStatutoryCodes: string[];
};

export type ActivateChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  href: string;
  detail: string | null;
};

export type ActivateResult = {
  policyVersion: VersionRow;
  componentCount: number;
  checklist: ActivateChecklistItem[];
};

export type SalaryComponent = {
  id: number;
  code: string;
  name: string;
  type: ComponentType;
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

export type PaginatedResult<T> = {
  items: T[];
  total: number;
};
