import { z } from "zod";
import { genIterationSettingsSchema } from "@/contracts/build-contracts.generated";

export const iterationSettingsSchema = genIterationSettingsSchema;

export type IterationSettings = z.infer<typeof iterationSettingsSchema>;

export const updateIterationSettingsSchema = z.object({
  defaultDurationWeeks: z.number().int().min(1).max(4).optional(),
  namingPrefix: z.string().min(1).max(20).optional(),
});

export type UpdateIterationSettingsInput = z.infer<typeof updateIterationSettingsSchema>;
