import { z } from "zod";

const crmSequenceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  entityType: z.string(),
  isActive: z.boolean(),
  stopOn: z.unknown().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const crmSequenceStepSchema = z.object({
  id: z.string(),
  sequenceId: z.string(),
  sortOrder: z.number().int(),
  stepType: z.string(),
  config: z.unknown().nullable(),
  waitHours: z.number().int().nullable(),
});

const crmSequenceEnrollmentSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  sequenceId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  status: z.string(),
  currentStep: z.number().int(),
  nextRunAt: z.string().nullable(),
  stopReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sequencesListContract = z.object({
  sequences: z.array(crmSequenceSchema),
});

export const sequenceContract = z.object({
  sequence: crmSequenceSchema,
});

export const stepsListContract = z.object({
  steps: z.array(crmSequenceStepSchema),
});

export const stepContract = z.object({
  step: crmSequenceStepSchema,
});

export const enrollmentsListContract = z.object({
  enrollments: z.array(crmSequenceEnrollmentSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const enrollmentContract = z.object({
  enrollment: crmSequenceEnrollmentSchema,
});

export const deleteSequenceContract = z.object({ success: z.boolean() });
