import { z } from "zod";

const kpiRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  unit: z.string().nullable(),
  target: z.string().nullable(),
  type: z.string(),
  ownerId: z.string().nullable(),
  ownerMembershipId: z.number().int().nullable(),
  period: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const competencyRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  frameworkId: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  level: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const frameworkRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kpiListContract = z.array(kpiRowSchema);

export const kpiArrayContract = z.array(kpiRowSchema);

export const kpiDeleteContract = z.object({ success: z.literal(true) });

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
