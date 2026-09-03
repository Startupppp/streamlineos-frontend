import { z } from "zod";

/**
 * The two payroll setup previews, contracted at the fetch seam.
 *
 * They look alike and are not. `POST /payroll/templates/:id/preview` takes an `annualCtc` from
 * the user and answers a simulated MONTHLY PAYSLIP through `computeTemplatePreview`.
 * `POST /payroll/policies/preview` takes no CTC at all — its request schema is `.strict()` and
 * carries none, and the setup wizard's draft never collects one — so it answers what each
 * component IS, never what it pays.
 *
 * The client declared one type over both. The setup review step read `line.monthlyAmount` off the
 * policy preview, a field that route has never emitted, and `formatMoney` rendered every salary
 * component as an em dash. Both repositories typechecked clean throughout, because
 * `apiClient.post<T>` is a cast and nothing in the type system ever sees the wire.
 */

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

/**
 * A component DEFINITION. `amount` is `decimal(15,2)` as a string, `percent` is `decimal(7,4)`,
 * and both are `null` — never absent — when the calculation does not use them.
 */
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

/**
 * `toggles` is the template's defaults spread with the caller's `toggleOverrides`, which the
 * request schema types as an open `Record<string, boolean>` — so the key set is not closed and
 * declaring it as the toggle enum would be a claim the route does not make.
 */
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

/** A simulated payslip line. `monthlyAmount` exists HERE, and only here. */
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

/**
 * `template` is a three-field stub the service builds by hand, not the full `TemplateRow` the
 * client used to declare; `annualCtc` and `monthlyCtc` are numbers, because
 * `computeTemplatePreview` divides rather than formatting.
 */
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
