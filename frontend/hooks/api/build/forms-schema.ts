import { z } from "zod";

export const formRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  formNumber: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  fields: z.unknown(),
  actions: z.unknown(),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  publicToken: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const formListContract = z.array(formRowContract);

export const submissionRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  formId: z.number().int(),
  projectId: z.number().int(),
  values: z.unknown(),
  status: z.string(),
  submittedByName: z.string().nullable(),
  submittedById: z.string().nullable(),
  convertedTicketId: z.number().int().nullable(),
  createdAt: z.string(),
});

export const submissionListContract = z.array(submissionRowContract);

export const submissionCreateResultContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  formId: z.number().int(),
  projectId: z.number().int(),
  values: z.unknown(),
  status: z.string(),
  submittedByName: z.string().nullable(),
  submittedById: z.string().nullable(),
  convertedTicketId: z.number().int().nullable(),
  createdAt: z.string(),
  createdTicketIds: z.array(z.number().int()),
  executedActionTypes: z.array(z.string()),
  skippedActionTypes: z.array(z.string()),
});

export const formSuccessContract = z.object({ success: z.literal(true) });
