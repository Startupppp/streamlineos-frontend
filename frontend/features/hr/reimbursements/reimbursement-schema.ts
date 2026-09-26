import { z } from "zod";
import { CATEGORIES, isValidOtherLabel } from "./reimbursement-status";
import { reimbursementAmountStringSchema } from "@/lib/validation/reimbursement-amount";

export const REIMBURSEMENT_MIN_AMOUNT = 1;
export const REIMBURSEMENT_MAX_AMOUNT = 999999;

export const reimbursementSchema = z
  .object({
    category: z.string().refine((value) => CATEGORIES.includes(value), "Choose a category"),
    customCategory: z.string().trim().transform((value) => value.replace(/\s+/g, " ")),
    amount: reimbursementAmountStringSchema,
    description: z.string().trim().max(1000, "Description must be 1000 characters or fewer"),
  })
  .superRefine((values, ctx) => {
    if (values.category !== "Other") return;
    if (!values.customCategory) {
      ctx.addIssue({ code: "custom", path: ["customCategory"], message: "Describe what the other category is" });
      return;
    }
    if (!isValidOtherLabel(values.customCategory))
      ctx.addIssue({
        code: "custom",
        path: ["customCategory"],
        message: "Category can only use letters, numbers, spaces, apostrophes, periods, and hyphens",
      });
  });

export type ReimbursementFormValues = z.infer<typeof reimbursementSchema>;

export const REIMBURSEMENT_DEFAULTS: ReimbursementFormValues = {
  category: "Travel",
  customCategory: "",
  amount: "",
  description: "",
};

export function resolvedReimbursementCategory(values: ReimbursementFormValues): string {
  return values.category === "Other" ? values.customCategory : values.category;
}
