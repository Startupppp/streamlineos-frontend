import { z } from "zod";

const userMiniSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

const reimbursementRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  category: z.string(),
  amount: z.string(),
  description: z.string().nullable(),
  receiptUrl: z.string().nullable(),
  status: z.string(),
  userMembershipId: z.number().int().nullable(),
  payrollMonth: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedByMembershipId: z.number().int().nullable(),
  approvedAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: userMiniSchema.nullable().optional(),
});

export const reimbursementsListContract = z.object({
  items: z.array(reimbursementRowSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export const createReimbursementContract = reimbursementRowSchema;

export const processReimbursementContract = z.object({ success: z.literal(true) });
