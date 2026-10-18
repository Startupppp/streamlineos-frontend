import { z } from "zod";
import type { ComponentType, ComponentPayCategory, CalcMethod } from "@/types/payroll/setup";
import { DB_ENUMS } from "@/contracts/db-enums.generated";
import { PAYROLL_AMOUNT_MAX } from "@/lib/validation/payroll-bounds";

export const COMPONENT_TYPES: { value: ComponentType; label: string }[] = [
  { value: "EARNING", label: "Earning" },
  { value: "DEDUCTION", label: "Deduction" },
  { value: "EMPLOYER_CONTRIBUTION", label: "Employer Contribution" },
  { value: "REIMBURSEMENT", label: "Reimbursement" },
  { value: "TAX", label: "Tax" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export const PAY_CATEGORIES: { value: ComponentPayCategory; label: string }[] = [
  { value: "REGULAR", label: "Regular pay" },
  { value: "BONUS", label: "Bonus (left out of Labour Code wages)" },
];

export function toPayCategoryPayload(
  form: Pick<ComponentForm, "type" | "payCategory">,
  saved: ComponentPayCategory | undefined,
): { payCategory?: ComponentPayCategory } {
  const payCategory = form.type === "EARNING" ? form.payCategory : "REGULAR";
  return payCategory === (saved ?? "REGULAR") ? {} : { payCategory };
}

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
const AMOUNT_VALUE = /^\d+(\.\d{1,2})?$/;
const PERCENT_OF_COMPONENT_FORMULA = /^([A-Z][A-Z0-9_]*) \* (\d+(?:\.\d{1,4})?) \/ 100$/;

export const componentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).regex(/^[^<>]*$/, "Name cannot contain < or >"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(20)
    .regex(/^[A-Za-z0-9_]+$/, "Use letters, digits or underscores only"),
  type: z.enum([
    "EARNING",
    "DEDUCTION",
    "EMPLOYER_CONTRIBUTION",
    "REIMBURSEMENT",
    "TAX",
    "ADJUSTMENT",
  ]),
  payCategory: z.enum(DB_ENUMS.salary_component_pay_category),
  calcMethod: z.enum([
    "FIXED",
    "PERCENT_OF",
    "FORMULA",
    "ATTENDANCE_BASED",
    "TIMESHEET_BASED",
    "MANUAL",
  ]),
  amount: z
    .string()
    .refine((v) => !v || AMOUNT_VALUE.test(v), "Enter an amount like 5000 or 5000.50")
    .refine(
      (v) => !v || parseFloat(v) <= PAYROLL_AMOUNT_MAX,
      `Cannot exceed ₹${PAYROLL_AMOUNT_MAX.toLocaleString("en-IN")}`,
    )
    .optional(),
  percent: z.string().optional(),
  percentBase: z.string().optional(),
  formula: z.string().optional(),
  taxable: z.boolean(),
  showOnPayslip: z.boolean(),
  includeInCtc: z.boolean(),
  sortOrder: z.string().optional(),
}).superRefine((form, ctx) => {
  const amount = form.amount ?? "";
  // A malformed amount already has its own message; only well-formed or blank amounts get this one.
  if (form.calcMethod === "FIXED" && (!amount || AMOUNT_VALUE.test(amount)) && !(parseFloat(amount) > 0)) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter an amount greater than 0" });
  }
  if (form.calcMethod !== "PERCENT_OF") return;
  if (!form.percentBase) ctx.addIssue({ code: "custom", path: ["percentBase"], message: "Pick what this is a percent of" });
  const percentStr = form.percent ?? "";
  if (!PERCENT_VALUE.test(percentStr)) {
    ctx.addIssue({ code: "custom", path: ["percent"], message: "Enter a percentage like 50 or 12.5" });
    return;
  }
  const n = parseFloat(percentStr);
  if (n <= 0) ctx.addIssue({ code: "custom", path: ["percent"], message: "Percentage must be greater than 0" });
  else if (n > 100) ctx.addIssue({ code: "custom", path: ["percent"], message: "Percentage must be between 0 and 100" });
});

export type ComponentForm = z.infer<typeof componentFormSchema>;

type CalcFields = Pick<ComponentForm, "calcMethod" | "percent" | "percentBase" | "formula">;
type CalcPayload = { calcMethod: CalcMethod; percent?: string; formula?: string };

function trimPercent(percent: string): string {
  return String(Number(percent));
}

export function toCalcPayload(form: CalcFields): CalcPayload {
  if (form.calcMethod !== "PERCENT_OF") {
    return { calcMethod: form.calcMethod, formula: form.formula || undefined };
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
