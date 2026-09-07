import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const payrollPeriodContract = z.object({
  id: z.number(),
  orgId: z.string(),
  periodKey: z.string(),
  status: z.enum(["open", "building", "built", "locked"]),
  cutoffDate: z.string().nullable(),
  builtAt: z.string().nullable(),
  lockedAt: z.string().nullable(),
  lockedBy: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const payrollPeriodListContract = cursorPageContract(payrollPeriodContract);

export const payrollPeriodLockedContract = payrollPeriodContract.extend({
  freeze: z.record(z.string(), z.unknown()),
  immutable: z.boolean(),
  contract: z.string(),
});

export const payrollSnapshotItemContract = z.object({
  id: z.number(),
  userId: z.string(),
  section: z.string(),
  payload: z.unknown(),
  sourceRefs: z.unknown().nullable(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userFirstName: z.string().nullable(),
  userLastName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const payrollSnapshotListContract = cursorPageContract(payrollSnapshotItemContract);

export const payrollAdjustmentListItemContract = z.object({
  id: z.number(),
  userId: z.string(),
  adjustmentType: z.string(),
  section: z.string(),
  amountCents: z.number().nullable(),
  days: z.string().nullable(),
  reason: z.string(),
  status: z.string(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userFirstName: z.string().nullable(),
  userLastName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const payrollAdjustmentListContract = cursorPageContract(payrollAdjustmentListItemContract);

export const payrollAdjustmentContract = z.object({
  id: z.number(),
  orgId: z.string(),
  periodId: z.number().nullable(),
  userId: z.string(),
  userMembershipId: z.number().nullable(),
  adjustmentType: z.string(),
  section: z.string(),
  amountCents: z.number().nullable(),
  days: z.string().nullable(),
  reason: z.string(),
  sourceChangeRef: z.unknown().nullable(),
  status: z.string(),
  createdBy: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedBy: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PayrollPeriod = z.infer<typeof payrollPeriodContract>;
export type PayrollSnapshotItem = z.infer<typeof payrollSnapshotItemContract>;
export type PayrollAdjustmentListItem = z.infer<typeof payrollAdjustmentListItemContract>;
export type PayrollAdjustment = z.infer<typeof payrollAdjustmentContract>;
