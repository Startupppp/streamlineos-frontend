import { z } from "zod";

const requisitionRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  department: z.string().nullable(),
  location: z.string().nullable(),
  headcount: z.number().int(),
  hiringManagerId: z.string().nullable(),
  hiringManagerMembershipId: z.number().int().nullable(),
  priority: z.string(),
  type: z.string(),
  status: z.string(),
  requestedBy: z.string(),
  requestedByMembershipId: z.number().int().nullable(),
  approverId: z.string().nullable(),
  approverMembershipId: z.number().int().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  justification: z.string().nullable(),
  targetDate: z.string().nullable(),
  linkedJobId: z.number().int().nullable(),
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
