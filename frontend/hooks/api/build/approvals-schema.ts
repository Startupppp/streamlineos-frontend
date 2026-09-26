import { z } from "zod";

const APPROVAL_STATUS_VALUES = [
  "requested",
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "escalated",
  "cancelled",
] as const;

const APPROVAL_ENTITY_TYPE_VALUES = [
  "task",
  "milestone",
  "budget",
  "release",
  "change_request",
  "document",
  "timesheet",
  "client_approval",
] as const;

export const approvalStatusSchema = z.enum(APPROVAL_STATUS_VALUES);
export const approvalEntityTypeSchema = z.enum(APPROVAL_ENTITY_TYPE_VALUES);

export const approvalInboxItemContract = z.object({
  id: z.number().int(),
  projectId: z.number().int().nullable(),
  projectName: z.string().nullable(),
  projectKey: z.string().nullable(),
  entityType: approvalEntityTypeSchema,
  entityId: z.number().int(),
  title: z.string(),
  status: approvalStatusSchema,
  level: z.number().int(),
  dueAt: z.string().nullable(),
  requestedById: z.string().nullable(),
  decidedAt: z.string().nullable(),
});

export const approvalInboxListContract = z.array(approvalInboxItemContract);

export const approvalInboxPageContract = z.object({
  data: z.array(approvalInboxItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const approvalInboxResponseContract = z.union([
  approvalInboxPageContract,
  z.array(approvalInboxItemContract),
]);

export const approvalRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int().nullable(),
  entityType: approvalEntityTypeSchema,
  entityId: z.number().int(),
  title: z.string(),
  reason: z.string().nullable(),
  requestedById: z.string().nullable(),
  approverMembershipId: z.number().int().nullable(),
  status: approvalStatusSchema,
  level: z.number().int(),
  dueAt: z.string().nullable(),
  decisionComment: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const approvalListContract = z.array(approvalRowContract);

export const approvalPageContract = z.object({
  data: z.array(approvalRowContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const approvalResponseContract = z.union([
  approvalPageContract,
  z.array(approvalRowContract),
]);

export const approvalInboxCountContract = z.object({ count: z.number().int().nonnegative() });
