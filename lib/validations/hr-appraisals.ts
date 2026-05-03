import { z } from "zod";

export const appraisalTypeSchema = z.enum([
  "ANNUAL",
  "MID_YEAR",
  "QUARTERLY",
  "MONTHLY",
  "SEMI_ANNUAL",
  "PROBATION_COMPLETION",
  "CONFIRMATION",
  "ONBOARDING",
  "EXIT",
  "PROMOTION",
  "ROLE_CHANGE",
  "SALARY_REVISION",
  "PROJECT_COMPLETION",
  "CRITICAL_INCIDENT",
  "GOAL_BASED",
  "TARGET_ACHIEVEMENT",
]);

export const createAppraisalSchema = z.object({
  userId: z.string().min(1),
  cycleId: z.number().int().positive().optional(),
  type: appraisalTypeSchema,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confidentialityNote: z.string().max(2000).optional(),
});

export const patchAppraisalRatingsSchema = z.object({
  ratings: z
    .array(
      z.object({
        categoryId: z.number().int().positive(),
        selfScore: z.number().min(1).max(5).optional().nullable(),
        selfText: z.string().max(5000).optional().nullable(),
        managerScore: z.number().min(1).max(5).optional().nullable(),
        managerComment: z.string().max(5000).optional().nullable(),
      })
    )
    .min(1),
});

export const completeStageSchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const patchAppraisalMetaSchema = z.object({
  outcomeNotes: z.string().max(8000).optional(),
  confidentialityNote: z.string().max(2000).optional(),
});
