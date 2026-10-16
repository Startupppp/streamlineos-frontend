import { z } from "zod";

export const EXPENSE_AMOUNT_MAX = 1_000_000;

const AMOUNT_TEXT_RE = /^\d+(\.\d*)?$/;
const AMOUNT_TWO_DECIMALS_RE = /^\d+(\.\d{0,2})?$/;

function validateAmountText(value: string, ctx: z.RefinementCtx) {
  const text = value.trim();
  if (!text) {
    ctx.addIssue({ code: "custom", message: "Amount must be greater than 0" });
    return;
  }
  if (!AMOUNT_TEXT_RE.test(text)) {
    ctx.addIssue({ code: "custom", message: "Amount must be a positive number" });
    return;
  }
  if (!AMOUNT_TWO_DECIMALS_RE.test(text)) {
    ctx.addIssue({ code: "custom", message: "Amount can have at most 2 decimal places" });
    return;
  }
  const amount = Number(text);
  if (amount <= 0) {
    ctx.addIssue({ code: "custom", message: "Amount must be greater than 0" });
    return;
  }
  if (amount > EXPENSE_AMOUNT_MAX) {
    ctx.addIssue({ code: "custom", message: "Amount must be ₹10,00,000 or less" });
  }
}

const LABEL_CHARS_RE = /^[\p{L}\p{N}\s'.-]+$/u;
const CONSECUTIVE_SPECIAL_RE = /[^\p{L}\p{N}\s]{2,}/u;

function validateExpenseLabel(
  value: string,
  field: "customCategory" | "customPaymentMethod",
  label: string,
  ctx: z.RefinementCtx,
) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must be at least 2 characters`,
      path: [field],
    });
    return;
  }
  if (trimmed.length > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must be at most 100 characters`,
      path: [field],
    });
    return;
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must contain at least one letter`,
      path: [field],
    });
    return;
  }
  if (!LABEL_CHARS_RE.test(trimmed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} can only use letters, numbers, spaces, apostrophes, periods, and hyphens`,
      path: [field],
    });
    return;
  }
  if (CONSECUTIVE_SPECIAL_RE.test(trimmed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} cannot have consecutive special characters`,
      path: [field],
    });
  }
}

export const expenseFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  customCategory: z.string().optional(),
  amount: z.string().superRefine(validateAmountText),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  merchant: z
    .string()
    .max(200, "Merchant name must be at most 200 characters")
    .optional(),
  paymentMethod: z.string().optional(),
  customPaymentMethod: z.string().optional(),
  expenseDate: z.string().min(1, "Date is required"),
}).superRefine((data, ctx) => {
  if (data.expenseDate) {
    const expDate = new Date(data.expenseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (expDate > today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expense date cannot be in the future", path: ["expenseDate"] });
    }
  }
  if (data.category === "Other") {
    if (!data.customCategory?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please describe what the other category is",
        path: ["customCategory"],
      });
    } else {
      validateExpenseLabel(data.customCategory, "customCategory", "Category", ctx);
    }
  }
  if (data.paymentMethod === "Other") {
    if (!data.customPaymentMethod?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please describe what the other payment method is",
        path: ["customPaymentMethod"],
      });
    } else {
      validateExpenseLabel(data.customPaymentMethod, "customPaymentMethod", "Payment method", ctx);
    }
  }
  if (data.merchant?.trim()) {
    const merchant = data.merchant.trim();
    if (!LABEL_CHARS_RE.test(merchant)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Merchant can only use letters, numbers, spaces, apostrophes, periods, and hyphens",
        path: ["merchant"],
      });
    } else if (CONSECUTIVE_SPECIAL_RE.test(merchant)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Merchant cannot have consecutive special characters",
        path: ["merchant"],
      });
    }
  }
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;
