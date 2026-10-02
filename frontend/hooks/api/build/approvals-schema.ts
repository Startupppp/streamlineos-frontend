import { z } from "zod";
import {
  buildApprovalsCreateApprovalResponseSchema,
  buildApprovalsListApprovalsResponseSchema,
  approvalsInboxGetInboxResponseSchema,
} from "@/contracts/build-contracts.generated";

export const approvalStatusSchema = buildApprovalsCreateApprovalResponseSchema.shape.status;
export const approvalEntityTypeSchema = buildApprovalsCreateApprovalResponseSchema.shape.entityType;

export const approvalInboxItemContract = approvalsInboxGetInboxResponseSchema.shape.data.element;

export const approvalInboxPageContract = approvalsInboxGetInboxResponseSchema;

export const approvalRowContract = buildApprovalsCreateApprovalResponseSchema;

export const approvalPageContract = buildApprovalsListApprovalsResponseSchema;

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ApprovalEntityType = z.infer<typeof approvalEntityTypeSchema>;
