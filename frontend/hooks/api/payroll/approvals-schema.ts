import { z } from "zod";

const approvalStageContract = z.object({
  id: z.number(),
  orgId: z.string(),
  runId: z.number(),
  stage: z.number(),
  stageName: z.string(),
  requiredPermission: z.string(),
  status: z.string(),
  actedByMembershipId: z.number().nullable(),
  actedAt: z.string().nullable(),
  comment: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isCurrentUserApprover: z.boolean(),
  approverName: z.string(),
});

export const approvalListContract = z.array(approvalStageContract);

export const submitApprovalResponseContract = z.object({
  autoApproved: z.boolean(),
  runStatus: z.string(),
  stagesCreated: z.number().optional(),
  correlationId: z.string(),
});

export const approvalActionResponseContract = z.object({
  success: z.boolean(),
  runStatus: z.string(),
  correlationId: z.string(),
});

export const lockResponseContract = z.object({
  success: z.boolean(),
  lockedAt: z.string(),
  correlationId: z.string(),
});

export const reopenResponseContract = z.object({
  success: z.boolean(),
  reopenedAt: z.string(),
  correlationId: z.string(),
});

export const closeResponseContract = z.object({
  success: z.boolean(),
  closedAt: z.string(),
  correlationId: z.string(),
});

export type ApprovalStage = z.infer<typeof approvalStageContract>;
export type ApprovalList = z.infer<typeof approvalListContract>;
export type SubmitApprovalResult = z.infer<typeof submitApprovalResponseContract>;
export type ApproveStageResult = z.infer<typeof approvalActionResponseContract>;
