import { z } from "zod";

const crmSequenceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  entityType: z.string(),
  isActive: z.boolean(),
  stopOn: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const crmSequenceStepSchema = z.object({
  id: z.string(),
  sequenceId: z.string(),
  sortOrder: z.number().int(),
  stepType: z.enum(["email", "call_task", "whatsapp_task", "wait"] as const),
  config: z.record(z.string(), z.unknown()).nullable(),
  waitHours: z.number().int().nullable(),
});

const crmSequenceEnrollmentSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  sequenceId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  entityName: z.string().nullable(),
  status: z.enum(["active", "completed", "stopped", "failed"] as const),
  currentStep: z.number().int(),
  nextRunAt: z.string().nullable(),
  stopReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sequencesListContract = z.object({
  sequences: z.array(crmSequenceSchema),
});

export const sequenceContract = crmSequenceSchema;

export const stepsListContract = z.object({
  steps: z.array(crmSequenceStepSchema),
});

export const stepContract = crmSequenceStepSchema;

export const enrollmentsListContract = z.object({
  enrollments: z.array(crmSequenceEnrollmentSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const enrollmentContract = crmSequenceEnrollmentSchema;

export const deleteSequenceContract = z.object({ success: z.boolean() });
