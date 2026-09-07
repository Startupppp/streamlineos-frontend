import { z } from "zod";

export const formRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  formNumber: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(["task_request", "bug_report", "feature_request", "change_request", "client_approval", "risk_report", "qa_issue", "generic"]),
  fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(["text", "long_text", "number", "date", "dropdown", "multiselect", "checkbox", "url", "user", "currency", "rating"]),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
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
  values: z.record(z.string(), z.unknown()),
  status: z.enum(["submitted", "processed", "rejected"]),
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
  values: z.record(z.string(), z.unknown()),
  status: z.enum(["submitted", "processed", "rejected"]),
  submittedByName: z.string().nullable(),
  submittedById: z.string().nullable(),
  convertedTicketId: z.number().int().nullable(),
  createdAt: z.string(),
  createdTicketIds: z.array(z.number().int()),
  executedActionTypes: z.array(z.string()),
  skippedActionTypes: z.array(z.string()),
});

export const formSuccessContract = z.object({ success: z.literal(true) });
