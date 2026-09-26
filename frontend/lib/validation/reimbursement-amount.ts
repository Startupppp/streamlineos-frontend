import { z } from "zod";

export const REIMBURSEMENT_AMOUNT_MIN = 1;
export const REIMBURSEMENT_AMOUNT_MAX = 999999;

export const reimbursementAmountStringSchema = z
  .string()
  .trim()
  .refine((v) => v.length > 0, { message: "Amount is required", abort: true })
  .refine((v) => Number.isFinite(Number(v)), { message: "Amount must be a number", abort: true })
  .refine((v) => Number(v) >= REIMBURSEMENT_AMOUNT_MIN, {
    message: `Amount must be at least ₹${REIMBURSEMENT_AMOUNT_MIN}`,
    abort: true,
  })
  .refine((v) => Number(v) <= REIMBURSEMENT_AMOUNT_MAX, "Amount must be at most ₹9,99,999")
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), "Amount must have at most 2 decimal places");
