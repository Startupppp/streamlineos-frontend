import { z } from "zod";

const cursorPaginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const hrFormRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  audience: z.string(),
  workflowObjectType: z.string().nullable(),
  schema: z.array(z.unknown()),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const hrFormListContract = z.object({
  data: z.array(hrFormRowContract),
  total: z.number().int(),
  pagination: cursorPaginationContract,
});

export const hrFormSubmissionRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  formId: z.number().int(),
  formSchemaSnapshot: z.array(z.unknown()),
  submittedBy: z.string().nullable(),
  submittedByName: z.string().nullable(),
  subjectEmployeeId: z.number().int().nullable(),
  data: z.record(z.string(), z.unknown()),
  status: z.string(),
  workflowInstanceId: z.number().int().nullable(),
  createdAt: z.string(),
});

export const hrFormSubmissionListContract = z.object({
  data: z.array(hrFormSubmissionRowContract),
  total: z.number().int(),
  pagination: cursorPaginationContract,
});

export type HrFormRow = z.infer<typeof hrFormRowContract>;
export type HrFormList = z.infer<typeof hrFormListContract>;
export type HrFormSubmissionRow = z.infer<typeof hrFormSubmissionRowContract>;
export type HrFormSubmissionList = z.infer<typeof hrFormSubmissionListContract>;

export const hrFormDeleteContract = z.undefined();
