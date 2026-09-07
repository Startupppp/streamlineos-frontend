import { z } from "zod";

const cursorPaginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const retentionPolicyContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  recordType: z.enum(["employee", "document", "case", "attendance", "payroll"]),
  retentionMonths: z.number().int(),
  countryCode: z.string().nullable(),
  action: z.enum(["delete", "anonymize"]),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const retentionPolicyListContract = z.object({
  data: z.array(retentionPolicyContract),
  pagination: cursorPaginationContract,
});

export const dataRequestContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  subjectUserId: z.string(),
  subjectMembershipId: z.number().int().nullable(),
  type: z.enum(["export", "delete", "anonymize", "correction"]),
  status: z.enum(["pending", "approved", "processing", "completed", "rejected", "partial"]),
  requestedBy: z.string().nullable(),
  approvedBy: z.string().nullable(),
  reason: z.string().nullable(),
  completedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const dataRequestListContract = z.object({
  data: z.array(dataRequestContract),
  pagination: cursorPaginationContract,
});

export const processDataRequestContract = z.union([
  z.object({ exportedAt: z.string(), subjectUserId: z.string(), orgId: z.string(), profile: z.record(z.string(), z.unknown()) }),
  z.object({ anonymized: z.literal(true), subjectUserId: z.string().optional() }),
  z.object({}),
]);

export type RetentionPolicyResponse = z.infer<typeof retentionPolicyContract>;
export type DataRequestResponse = z.infer<typeof dataRequestContract>;

export const retentionDeleteContract = z.undefined();
