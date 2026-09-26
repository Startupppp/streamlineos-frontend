import { z } from "zod";

export const iterationSettingsSchema = z.object({
  defaultDurationWeeks: z.number().int().min(1).max(4),
  namingPrefix: z.string(),
});

export type IterationSettings = z.infer<typeof iterationSettingsSchema>;

export const updateIterationSettingsSchema = z.object({
  defaultDurationWeeks: z.number().int().min(1).max(4).optional(),
  namingPrefix: z.string().min(1).max(20).optional(),
});

export type UpdateIterationSettingsInput = z.infer<typeof updateIterationSettingsSchema>;
