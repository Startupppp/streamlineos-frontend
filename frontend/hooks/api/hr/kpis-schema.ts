import { z } from "zod";

const kpiRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  unit: z.string().nullable(),
  target: z.string().nullable(),
  weight: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

const competencyRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  frameworkId: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  weight: z.string(),
  createdAt: z.string(),
});

const frameworkLevelSchema = z.object({
  level: z.number(),
  label: z.string(),
  description: z.string(),
});

const frameworkRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ratingScale: z.number().int(),
  levels: z.array(frameworkLevelSchema),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const kpiListContract = z.array(kpiRowSchema);

export const kpiArrayContract = z.array(kpiRowSchema);

export const frameworkListContract = z.array(
  frameworkRowSchema.extend({
    competencies: z.array(competencyRowSchema),
  }),
);

export const frameworkArrayContract = z.array(frameworkRowSchema);

export const competencyArrayContract = z.array(competencyRowSchema);

export type KpiRow = z.infer<typeof kpiRowSchema>;
export type CompetencyRow = z.infer<typeof competencyRowSchema>;
export type FrameworkRow = z.infer<typeof frameworkRowSchema>;
