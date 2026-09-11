import { z } from "zod";

export const shiftTemplateContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  type: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number().int(),
  isNightShift: z.boolean(),
  gracePeriodMinutes: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const shiftTemplateListContract = z.array(shiftTemplateContract);

export const shiftAssignmentContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  shiftId: z.number().int(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const shiftAssignmentListContract = z.array(shiftAssignmentContract);

export const shiftSwapContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  requesterId: z.string(),
  requesterMembershipId: z.number().int().nullable(),
  targetUserId: z.string(),
  targetMembershipId: z.number().int().nullable(),
  requestDate: z.string(),
  targetDate: z.string(),
  reason: z.string().nullable(),
  status: z.string(),
  approverId: z.string().nullable(),
  approverMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
});

export const shiftSwapListContract = z.array(shiftSwapContract);

export type ShiftTemplate = z.infer<typeof shiftTemplateContract>;
export type ShiftAssignment = z.infer<typeof shiftAssignmentContract>;
export type ShiftSwap = z.infer<typeof shiftSwapContract>;

export const shiftDeleteContract = z.undefined();
