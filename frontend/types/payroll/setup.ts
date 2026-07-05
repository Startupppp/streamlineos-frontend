export type ToggleKey =
  | "pf"
  | "esi"
  | "professionalTax"
  | "tds"
  | "gratuity"
  | "lwf"
  | "lopFromAttendance"
  | "overtime"
  | "timesheets"
  | "leaveSync"
  | "expenseSync"
  | "salesIncentives"
  | "manualAdjustments"
  | "reimbursements"
  | "bonuses"
  | "incentives"
  | "loans"
  | "contractorPayments"
  | "multiCurrency"
  | "employeeDeclarations"
  | "payrollVarianceWarnings"
  | "countryComplianceChecklist"
  | "globalPaymentReport"
  | "bankPayoutFile"
  | "payslipPublishing"
  | "emailPayslips"
  | "approvalWorkflow"
  | "managerApproval"
  | "financeApproval"
  | "lockAfterApproval"
  | "essShowSalaryStructure"
  | "essAllowBankUpdate"
  | "essAllowLoanRequests"
  | "essAllowTaxDeclarations"
  | "essAllowReimbursements";

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

export type PayFrequency = "MONTHLY" | "SEMI_MONTHLY" | "BI_WEEKLY" | "WEEKLY";

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

export type PreviewLine = {
  code: string;
  name: string;
  type: ComponentType;
  calcMethod: CalcMethod;
  monthlyAmount: string;
  explain: string;
};

export type TemplatePreviewResult = {
  template: TemplateRow;
  effectiveToggles: Record<ToggleKey, boolean>;
  annualCtc: string;
  monthlyCtc: string;
  components: PreviewLine[];
  totals: {
    grossEarnings: string;
    totalDeductions: string;
    employerContributions: string;
    netTakeHome: string;
  };
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

export type ComplianceChecklistItem = {
  key: string;
  label: string;
  detail: string;
};

export type StatutoryPackItemKind =
  | "EMPLOYEE_DEDUCTION"
  | "EMPLOYER_CONTRIBUTION"
  | "WITHHOLDING";

export type StatutoryPackItem = {
  key: string;
  label: string;
  kind: StatutoryPackItemKind;
  componentCode: string;
  enabled: boolean;
  calc: Record<string, unknown>;
  note?: string;
};

export type StatutoryPackPreview = {
  country: string;
  countryName: string;
  currency: string;
  taxRegimeApplicable: boolean;
  items: StatutoryPackItem[];
  complianceChecklist: ComplianceChecklistItem[];
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

export type ApprovalStage = {
  stage: number;
  stageName: string;
  requiredPermission: string;
};

export type CalendarPlan = {
  attendanceCutoff: string | null;
  approvalDeadline: string | null;
  payDate: string | null;
};

export type PolicyPreviewResult = {
  toggles: Record<ToggleKey, boolean>;
  components: PreviewLine[];
  approvalChain: ApprovalStage[];
  calendarPlan: CalendarPlan | null;
  essOptions: Record<string, unknown>;
  statutoryPack: StatutoryPackPreview;
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
