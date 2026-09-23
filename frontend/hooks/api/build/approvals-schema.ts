import { z } from "zod";

export const approvalInboxItemContract = z.object({
  id: z.number().int(),
  projectId: z.number().int().nullable(),
  projectName: z.string().nullable(),
  projectKey: z.string().nullable(),
  entityType: z.string(),
  entityId: z.number().int(),
  title: z.string(),
  status: z.string(),
  level: z.number().int(),
  dueAt: z.string().nullable(),
  requestedById: z.string().nullable(),
  decidedAt: z.string().nullable(),
});

export const approvalInboxListContract = z.array(approvalInboxItemContract);

export const approvalRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int().nullable(),
  entityType: z.string(),
  entityId: z.number().int(),
  title: z.string(),
  reason: z.string().nullable(),
  requestedById: z.string().nullable(),
  approverMembershipId: z.number().int().nullable(),
  status: z.string(),
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

export const approvalInboxCountContract = z.object({ count: z.number().int().nonnegative() });
