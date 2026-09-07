import { z } from "zod";

const cursorPagination = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const headcountRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  orgDepartmentId: z.string().nullable(),
  requestedBy: z.string(),
  requestedByMembershipId: z.number().int().nullable(),
  requestedRole: z.string(),
  level: z.string().nullable(),
  justification: z.string().nullable(),
  targetDate: z.string().nullable(),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "JOB_CREATED"]),
  approvedBy: z.string().nullable(),
  approvedByMembershipId: z.number().int().nullable(),
  approvedAt: z.string().nullable(),
  rejectedReason: z.string().nullable(),
  linkedJobPostingId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const headcountListItemContract = headcountRowContract.extend({
  departmentName: z.string().nullable(),
  requesterName: z.string().nullable(),
  requesterEmail: z.string().nullable(),
});

export const headcountListPageContract = z.object({
  data: z.array(headcountListItemContract),
  pagination: cursorPagination,
});

export const headcountRowSingleContract = headcountRowContract;

export const createJobFromHeadcountContract = z.object({
  jobId: z.number().int(),
});
