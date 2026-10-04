import { z } from "zod";
import type { ComponentType, CalcMethod } from "@/types/payroll/setup";

export const COMPONENT_TYPES: { value: ComponentType; label: string }[] = [
  { value: "EARNING", label: "Earning" },
  { value: "DEDUCTION", label: "Deduction" },
  { value: "EMPLOYER_CONTRIBUTION", label: "Employer Contribution" },
  { value: "REIMBURSEMENT", label: "Reimbursement" },
  { value: "TAX", label: "Tax" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export type FormCalcMethod = Exclude<CalcMethod, "PERCENT_OF_BASIC" | "PERCENT_OF_GROSS"> | "PERCENT_OF";

export const CALC_METHODS: { value: FormCalcMethod; label: string }[] = [
  { value: "FIXED", label: "Fixed Amount" },
  { value: "PERCENT_OF", label: "Percent of…" },
  { value: "FORMULA", label: "Formula" },
  { value: "ATTENDANCE_BASED", label: "Attendance Based" },
  { value: "TIMESHEET_BASED", label: "Timesheet Based" },
  { value: "MANUAL", label: "Manual Input" },
];

export const FORMULA_HELP =
  "Variables: basic, gross, ctc, days_in_month, paid_days, lop_days, overtime_hours, incentive_amount, reimbursement_amount, or another component's CODE";

export const PERCENT_BASE_BASIC = "basic";
export const PERCENT_BASE_GROSS = "gross";

const PERCENT_VALUE = /^\d+(\.\d{1,4})?$/;
const PERCENT_OF_COMPONENT_FORMULA = /^([A-Z][A-Z0-9_]*) \* (\d+(?:\.\d{1,4})?) \/ 100$/;

export const componentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  type: z.enum([
    "EARNING",
    "DEDUCTION",
    "EMPLOYER_CONTRIBUTION",
    "REIMBURSEMENT",
    "TAX",
    "ADJUSTMENT",
  ]),
  calcMethod: z.enum([
    "FIXED",
    "PERCENT_OF",
    "FORMULA",
    "ATTENDANCE_BASED",
    "TIMESHEET_BASED",
    "MANUAL",
  ]),
  amount: z.string().optional(),
  percent: z.string().optional(),
  percentBase: z.string().optional(),
  formula: z.string().optional(),
  taxable: z.boolean(),
  showOnPayslip: z.boolean(),
  includeInCtc: z.boolean(),
  sortOrder: z.string().optional(),
}).superRefine((form, ctx) => {
  if (form.calcMethod !== "PERCENT_OF") return;
  if (!form.percentBase) ctx.addIssue({ code: "custom", path: ["percentBase"], message: "Pick what this is a percent of" });
  if (!PERCENT_VALUE.test(form.percent ?? "")) ctx.addIssue({ code: "custom", path: ["percent"], message: "Enter a percentage like 50 or 12.5" });
});

export type ComponentForm = z.infer<typeof componentFormSchema>;

type CalcFields = Pick<ComponentForm, "calcMethod" | "percent" | "percentBase" | "formula">;
type CalcPayload = { calcMethod: CalcMethod; percent?: string; formula?: string };

function trimPercent(percent: string): string {
  return String(Number(percent));
}

export function toCalcPayload(form: CalcFields): CalcPayload {
  if (form.calcMethod !== "PERCENT_OF") {
    return { calcMethod: form.calcMethod, percent: form.percent || undefined, formula: form.formula || undefined };
  }
  const percent = form.percent ?? "";
  if (form.percentBase === PERCENT_BASE_BASIC) return { calcMethod: "PERCENT_OF_BASIC", percent };
  if (form.percentBase === PERCENT_BASE_GROSS) return { calcMethod: "PERCENT_OF_GROSS", percent };
  return { calcMethod: "FORMULA", formula: `${form.percentBase} * ${percent} / 100` };
}

export function fromComponentCalc(component: {
  calcMethod: CalcMethod;
  percent: string | null;
  formula: string | null;
}): CalcFields {
  if (component.calcMethod === "PERCENT_OF_BASIC" || component.calcMethod === "PERCENT_OF_GROSS") {
    return {
      calcMethod: "PERCENT_OF",
      percentBase: component.calcMethod === "PERCENT_OF_BASIC" ? PERCENT_BASE_BASIC : PERCENT_BASE_GROSS,
      percent: component.percent ? trimPercent(component.percent) : "",
      formula: "",
    };
  }
  const match = component.calcMethod === "FORMULA" ? PERCENT_OF_COMPONENT_FORMULA.exec(component.formula ?? "") : null;
  if (match) return { calcMethod: "PERCENT_OF", percentBase: match[1], percent: match[2], formula: "" };
  return {
    calcMethod: component.calcMethod,
    percentBase: "",
    percent: component.percent ?? "",
    formula: component.formula ?? "",
  };
}
