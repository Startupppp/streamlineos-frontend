import { z } from "zod";

export const PAYROLL_AMOUNT_MAX = 9_999_999;

const NON_NEGATIVE_DECIMAL = /^\d+(\.\d{1,2})?$/;

export const payrollAmountField = z
  .string()
  .min(1, "Enter an amount")
  .regex(NON_NEGATIVE_DECIMAL, "Enter a number with up to 2 decimal places")
  .refine(
    (v) => parseFloat(v) <= PAYROLL_AMOUNT_MAX,
    `Cannot exceed ₹${PAYROLL_AMOUNT_MAX.toLocaleString("en-IN")}`,
  );

export const payrollPercentField = z
  .string()
  .min(1, "Enter a percentage")
  .regex(NON_NEGATIVE_DECIMAL, "Enter a percentage between 0 and 100")
  .refine(
    (v) => parseFloat(v) <= 100,
    "Percentage must be between 0 and 100",
  );

export const payrollPercentFieldPositive = payrollPercentField.refine(
  (v) => parseFloat(v) > 0,
  "Percentage must be greater than 0",
);
