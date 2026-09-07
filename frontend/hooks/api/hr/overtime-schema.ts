import { z } from "zod";

const overtimeRequestRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  date: z.string(),
  hours: z.string(),
  reason: z.string().nullable(),
  status: z.string(),
  approverId: z.string().nullable(),
  approverMembershipId: z.number().int().nullable(),
  convertToCompOff: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const overtimeListContract = z.object({
  items: z.array(overtimeRequestRowSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const createOvertimeContract = overtimeRequestRowSchema;

export const approveOvertimeContract = overtimeRequestRowSchema;

export const rejectOvertimeContract = overtimeRequestRowSchema;

export const compOffBalanceContract = z.array(
  z.object({
    id: z.number().int(),
    orgId: z.string(),
    userId: z.string(),
    userMembershipId: z.number().int().nullable(),
    earnedDays: z.string(),
    usedDays: z.string(),
    expiryDate: z.string().nullable(),
    updatedAt: z.string(),
  }),
);
