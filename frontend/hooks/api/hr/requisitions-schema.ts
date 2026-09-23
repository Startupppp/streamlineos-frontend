import { z } from "zod";

const requisitionRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  department: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  headcount: z.number().int(),
  budgetMin: z.string().nullable().optional(),
  budgetMax: z.string().nullable().optional(),
  hiringManagerId: z.string().nullable().optional(),
  hiringManagerMembershipId: z.number().int().nullable().optional(),
  priority: z.string(),
  type: z.string(),
  status: z.string(),
  requestedBy: z.string(),
  requestedByMembershipId: z.number().int().nullable().optional(),
  approverId: z.string().nullable().optional(),
  approverMembershipId: z.number().int().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  justification: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  headcountId: z.number().int().nullable().optional(),
  linkedJobId: z.number().int().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const requisitionsListContract = z.array(requisitionRowSchema);

export const createRequisitionContract = requisitionRowSchema;

export const submitRequisitionContract = requisitionRowSchema;

export const approveRequisitionContract = requisitionRowSchema;

export const rejectRequisitionContract = requisitionRowSchema;

export const createJobFromRequisitionContract = z.object({
  jobId: z.number().int(),
  jobTitle: z.string(),
});
