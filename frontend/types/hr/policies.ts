export const HR_POLICY_TYPES = [
  "leave",
  "attendance",
  "shift_roster",
  "overtime",
  "comp_off",
  "probation",
  "notice_period",
  "document_requirement",
  "approval",
  "expense",
  "travel",
  "asset",
  "wfh",
  "remote_work",
  "payroll_eligibility",
] as const;

export type HrPolicyType = (typeof HR_POLICY_TYPES)[number];

export const HR_POLICY_STATUSES = ["draft", "active", "archived"] as const;
export type HrPolicyStatus = (typeof HR_POLICY_STATUSES)[number];

export const HR_SCOPE_TYPES = [
  "organization",
  "country",
  "state",
  "location",
  "department",
  "team",
  "role",
  "job_level",
  "employment_type",
  "employee",
] as const;
export type HrPolicyScopeType = (typeof HR_SCOPE_TYPES)[number];

export interface HrPolicyScope {
  id: number;
  orgId: string;
  policyId: number;
  scopeType: HrPolicyScopeType;
  scopeValue: string;
}

export interface HrPolicy {
  id: number;
  orgId: string;
  policyType: HrPolicyType;
  name: string;
  description: string | null;
  status: HrPolicyStatus;
  version: number;
  parentPolicyId: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  rules: Record<string, unknown>;
  priority: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  scopes: HrPolicyScope[];
}

export interface PoliciesListResponse {
  data: HrPolicy[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface PolicyEvaluationTrace {
  policyId: number;
  policyName: string;
  version: number;
  matchedScopes: Array<{
    scopeType: string;
    scopeValue: string;
    specificity: number;
  }>;
  maxSpecificity: number;
  priority: number;
}

export interface PolicyPreviewResult {
  policy: {
    id: number;
    name: string;
    policyType: string;
    version: number;
    status: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    priority: number;
    rules: Record<string, unknown>;
  };
  rules: Record<string, unknown>;
  trace: PolicyEvaluationTrace;
}

export interface CreatePolicyInput {
  policyType: HrPolicyType;
  name: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  priority: number;
  rules: Record<string, unknown>;
  scopes: Array<{ scopeType: string; scopeValue: string }>;
}

export type UpdatePolicyInput = Partial<
  Omit<CreatePolicyInput, "policyType">
>;

export const POLICY_TYPE_LABELS: Record<HrPolicyType, string> = {
  leave: "Leave",
  attendance: "Attendance",
  shift_roster: "Shift / Roster",
  overtime: "Overtime",
  comp_off: "Comp-Off",
  probation: "Probation",
  notice_period: "Notice Period",
  document_requirement: "Document Requirement",
  approval: "Approval",
  expense: "Expense",
  travel: "Travel",
  asset: "Asset",
  wfh: "Work From Home",
  remote_work: "Remote Work",
  payroll_eligibility: "Payroll Eligibility",
};

export const SCOPE_TYPE_LABELS: Record<HrPolicyScopeType, string> = {
  organization: "Organization",
  country: "Country",
  state: "State",
  location: "Location",
  department: "Department",
  team: "Team",
  role: "Role",
  job_level: "Job Level",
  employment_type: "Employment Type",
  employee: "Employee",
};
