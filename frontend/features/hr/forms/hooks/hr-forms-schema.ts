import { z } from "zod";

const cursorPaginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const hrFormFieldContract = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum([
    "text", "long_text", "number", "date", "select", "multi_select",
    "boolean", "file", "employee_ref", "department_ref", "currency",
  ]),
  required: z.boolean(),
  sensitive: z.boolean(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  conditional: z.object({
    fieldKey: z.string(),
    operator: z.enum(["eq", "neq", "contains", "notEmpty"]),
    value: z.unknown().optional(),
  }).nullable().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).nullable().optional(),
});

export const hrFormRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  status: z.enum(["draft", "active", "archived"]),
  audience: z.enum(["internal", "public"]),
  workflowObjectType: z.string().nullable(),
  schema: z.array(hrFormFieldContract),
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
  formSchemaSnapshot: z.array(hrFormFieldContract),
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
