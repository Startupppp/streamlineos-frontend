import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const optionalDate = z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Pick a date");

export const assignSchema = z
  .object({
    userId: z
      .string()
      .nullable()
      .refine((value) => value !== null && value !== "", "Choose who is paid under this plan"),
    effectiveFrom: isoDate,
    effectiveTo: optionalDate,
    quota: z
      .string()
      .trim()
      .refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) > 0), "A positive amount"),
  })
  .refine((value) => value.effectiveTo === "" || value.effectiveTo >= value.effectiveFrom, {
    path: ["effectiveTo"],
    message: "An assignment cannot end before it starts",
  });
export type AssignValues = z.infer<typeof assignSchema>;
export const endSchema = z.object({ effectiveTo: isoDate });
export type EndValues = z.infer<typeof endSchema>;
export const planSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000),
  retiredOn: optionalDate,
});
export type PlanValues = z.infer<typeof planSchema>;

export const calculateSchema = z.object({
  dealId: z.string().regex(/^[0-9]{1,9}$/, "Choose a won deal"),
});
export type CalculateValues = z.infer<typeof calculateSchema>;

export const rebuildSchema = z
  .object({ from: isoDate, to: isoDate, planId: z.string() })
  .refine((value) => value.to >= value.from, { path: ["to"], message: "The end cannot precede the start" });
export type RebuildValues = z.infer<typeof rebuildSchema>;
