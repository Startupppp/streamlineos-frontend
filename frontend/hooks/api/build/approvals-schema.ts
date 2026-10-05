import { z } from "zod";
import {
  buildApprovalsCreateApprovalResponseSchema,
  buildApprovalsListApprovalsResponseSchema,
  buildApprovalsGetApprovalResponseSchema,
  buildApprovalsUpdateApprovalResponseSchema,
  buildApprovalsDecideApprovalResponseSchema,
  buildApprovalsCreateApprovalBodySchema,
  buildApprovalsDecideApprovalBodySchema,
  buildApprovalsUpdateApprovalBodySchema,
  buildApprovalsSoftDeleteApprovalBodySchema,
  approvalsInboxGetInboxResponseSchema,
} from "@/contracts/build-contracts.generated";

export const approvalStatusSchema = buildApprovalsCreateApprovalResponseSchema.shape.status;
export const approvalEntityTypeSchema = buildApprovalsCreateApprovalResponseSchema.shape.entityType;

export const approvalInboxItemContract = approvalsInboxGetInboxResponseSchema.shape.data.element;

export const approvalInboxPageContract = approvalsInboxGetInboxResponseSchema;

export const approvalRowContract = buildApprovalsCreateApprovalResponseSchema;
export const approvalDetailContract = buildApprovalsGetApprovalResponseSchema;
export const approvalCreateContract = buildApprovalsCreateApprovalResponseSchema;
export const approvalUpdateContract = buildApprovalsUpdateApprovalResponseSchema;
export const approvalDecideContract = buildApprovalsDecideApprovalResponseSchema;
export const createApprovalInputSchema = buildApprovalsCreateApprovalBodySchema;
export const decideApprovalInputSchema = buildApprovalsDecideApprovalBodySchema;
export const updateApprovalInputSchema = buildApprovalsUpdateApprovalBodySchema;
export const deleteApprovalInputSchema = buildApprovalsSoftDeleteApprovalBodySchema;

export const approvalPageContract = buildApprovalsListApprovalsResponseSchema;

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ApprovalEntityType = z.infer<typeof approvalEntityTypeSchema>;
