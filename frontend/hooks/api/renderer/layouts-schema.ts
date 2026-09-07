import { z } from "zod";

const groupSchema = z.object({
  title: z.string(),
  fields: z.array(z.string()),
});

const layoutAdjustmentSchema = z.object({
  layoutKey: z.string(),
  order: z.array(z.string()),
  hidden: z.array(z.string()),
  groups: z.array(groupSchema),
  updatedAt: z.string(),
}).nullable();

export const layoutAdjustmentContract = layoutAdjustmentSchema;

export const layoutAdjustmentSaveContract = layoutAdjustmentSchema.unwrap();

export const layoutUsageContract = z.object({
  sample: z.number().int(),
  filled: z.record(z.string(), z.number()),
  cap: z.number().int().optional(),
  uncounted: z.number().int().optional(),
});
