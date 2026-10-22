import { z } from "zod";

export const decimalQuantitySchema = z
  .string()
  .min(1, "Quantity is required")
  .regex(/^\d+(\.\d{1,4})?$/, "Use a positive number with up to 4 decimal places")
  .refine((v) => parseFloat(v) > 0, { message: "Quantity must be greater than 0" });

export const decimalQuantityOrZeroSchema = z
  .string()
  .min(1, "Quantity is required")
  .regex(/^\d+(\.\d{1,4})?$/, "Use a number with up to 4 decimal places");
