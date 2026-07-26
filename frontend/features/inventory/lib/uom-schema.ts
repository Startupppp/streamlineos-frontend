import { z } from "zod";

export const uomSchema = z.object({
  name: z
    .string()
    .min(1, "Unit name is required.")
    .max(100, "Name must be 100 characters or fewer.")
    .refine((v) => v.trim().length > 0, "Unit name is required."),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required.")
    .max(20, "Abbreviation must be 20 characters or fewer.")
    .refine((v) => v.trim().length > 0, "Abbreviation is required."),
  category: z.string().optional(),
  isBase: z.boolean(),
  ratioToBase: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) > 0),
      "Must be a positive number",
    ),
  roundingPrecision: z.string().refine((v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 6;
  }, "Must be a whole number between 0 and 6"),
});

export type UomFormValues = z.infer<typeof uomSchema>;
