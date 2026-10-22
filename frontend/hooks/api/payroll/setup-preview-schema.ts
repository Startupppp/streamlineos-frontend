import { z } from "zod";


export const componentTypeContract = z.enum([
  "EARNING",
  "DEDUCTION",
  "EMPLOYER_CONTRIBUTION",
  "REIMBURSEMENT",
  "TAX",
  "ADJUSTMENT",
]);

export const calcMethodContract = z.enum([
  "FIXED",
  "PERCENT_OF_BASIC",
  "PERCENT_OF_GROSS",
  "FORMULA",
  "ATTENDANCE_BASED",
  "TIMESHEET_BASED",
  "MANUAL",
]);

export const policyPreviewComponentContract = z.object({
  code: z.string(),
  name: z.string(),
  type: componentTypeContract,
  calcMethod: calcMethodContract,
  amount: z.string().nullable(),
  percent: z.string().nullable(),
  formula: z.string().nullable(),
  taxable: z.boolean(),
  showOnPayslip: z.boolean(),
  includeInCtc: z.boolean(),
  isStatutory: z.boolean(),
  statutoryKey: z.string().nullable(),
  sortOrder: z.number(),
});

export const approvalStageContract = z.object({
  stage: z.number(),
  stageName: z.string(),
  requiredPermission: z.string(),
});

export const calendarPlanEventContract = z.object({
  type: z.string(),
  date: z.string(),
  title: z.string(),
});

export const complianceChecklistItemContract = z.object({
  key: z.string(),
  label: z.string(),
  detail: z.string(),
});

export const statutoryPackItemContract = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(["EMPLOYEE_DEDUCTION", "EMPLOYER_CONTRIBUTION", "WITHHOLDING"]),
  componentCode: z.string(),
  enabled: z.boolean(),
  calc: z.record(z.string(), z.unknown()),
  note: z.string().optional(),
});

export const statutoryPackPreviewContract = z.object({
  country: z.string(),
  countryName: z.string(),
  currency: z.string(),
  taxRegimeApplicable: z.boolean(),
  items: z.array(statutoryPackItemContract),
  complianceChecklist: z.array(complianceChecklistItemContract),
});

export const policyPreviewContract = z.object({
  toggles: z.record(z.string(), z.boolean()),
  components: z.array(policyPreviewComponentContract),
  approvalChain: z.array(approvalStageContract),
  calendarPlan: z.array(calendarPlanEventContract),
  essOptions: z.object({
    showSalaryStructure: z.boolean(),
    allowBankUpdate: z.boolean(),
    allowLoanRequests: z.boolean(),
    allowTaxDeclarations: z.boolean(),
    allowReimbursements: z.boolean(),
  }),
  statutoryPack: statutoryPackPreviewContract,
});

export const previewLineContract = z.object({
  code: z.string(),
  name: z.string(),
  type: componentTypeContract,
  calcMethod: calcMethodContract,
  monthlyAmount: z.string(),
  taxable: z.boolean(),
  includeInCtc: z.boolean(),
  isStatutory: z.boolean(),
  sortOrder: z.number(),
  explain: z.string(),
});

export const templatePreviewContract = z.object({
  template: z.object({
    id: z.number(),
    key: z.string().nullable(),
    name: z.string(),
  }),
  effectiveToggles: z.record(z.string(), z.boolean()),
  annualCtc: z.number(),
  monthlyCtc: z.number(),
  components: z.array(previewLineContract),
  totals: z.object({
    grossEarnings: z.string(),
    totalDeductions: z.string(),
    employerContributions: z.string(),
    netTakeHome: z.string(),
  }),
});

export type PolicyPreviewComponent = z.infer<typeof policyPreviewComponentContract>;
export type ApprovalStage = z.infer<typeof approvalStageContract>;
export type CalendarPlanEvent = z.infer<typeof calendarPlanEventContract>;
export type CalendarPlan = CalendarPlanEvent[];
export type ComplianceChecklistItem = z.infer<typeof complianceChecklistItemContract>;
export type StatutoryPackItem = z.infer<typeof statutoryPackItemContract>;
export type StatutoryPackPreview = z.infer<typeof statutoryPackPreviewContract>;
export type PolicyPreviewResult = z.infer<typeof policyPreviewContract>;
export type PreviewLine = z.infer<typeof previewLineContract>;
export type TemplatePreviewResult = z.infer<typeof templatePreviewContract>;
