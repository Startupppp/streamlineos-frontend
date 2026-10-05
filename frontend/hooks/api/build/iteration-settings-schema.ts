import { z } from "zod";
import { projectsSettingsIterationsGetSettingsResponseSchema } from "@/contracts/build-contracts.generated";

export const iterationSettingsSchema = projectsSettingsIterationsGetSettingsResponseSchema;

export type IterationSettings = z.infer<typeof iterationSettingsSchema>;

export const updateIterationSettingsSchema = z.object({
  defaultDurationWeeks: z.number().int().min(1).max(4).optional(),
  namingPrefix: z.string().min(1).max(20).optional(),
});

export type UpdateIterationSettingsInput = z.infer<typeof updateIterationSettingsSchema>;

export interface CycleDateRange {
  startDate: string;
  endDate: string;
}

export function cycleDateRangesOverlap(a: CycleDateRange, b: CycleDateRange): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function proposedCycleOverlapsExisting(
  proposed: CycleDateRange,
  existing: readonly CycleDateRange[],
): boolean {
  return existing.some((e) => cycleDateRangesOverlap(proposed, e));
}
