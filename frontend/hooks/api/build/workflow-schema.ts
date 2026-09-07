import { z } from "zod";

export const workflowTransitionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  fromStatusId: z.number().int().nullable(),
  toStatusId: z.number().int(),
  name: z.string().nullable(),
  requiresApproval: z.boolean(),
  requiredFields: z.array(z.string()),
  allowedRoles: z.array(z.string()),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const workflowTransitionListContract = z.array(workflowTransitionContract);

export const projectStatusContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  name: z.string(),
  order: z.number().int(),
  color: z.string().nullable(),
  type: z.string(),
  wipLimit: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workflowSuccessContract = z.object({ success: z.literal(true) });
