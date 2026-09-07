import { z } from "zod";

const ratingSchema = z
  .string()
  .trim()
  .min(1, "Rating is required")
  .regex(/^\d+(\.\d)?$/, "Use a number with at most 1 decimal place")
  .refine((v) => {
    const n = Number(v);
    return !Number.isNaN(n) && n >= 1 && n <= 5;
  }, "Rating must be between 1 and 5");

export const calibrationEntrySchema = z.object({
  performanceScore: ratingSchema,
  potentialScore: ratingSchema,
  note: z
    .string()
    .trim()
    .max(2000, "Note must be at most 2000 characters"),
});
