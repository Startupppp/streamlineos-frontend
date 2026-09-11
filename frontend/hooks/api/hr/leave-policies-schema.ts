import { z } from "zod";

export const leavePolicyRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  leaveTypeId: z.number().int(),
  name: z.string(),
  accrualType: z.string(),
  accrualRate: z.string(),
  maxBalance: z.string().nullable(),
  carryForwardDays: z.string(),
  carryForwardExpiryMonths: z.number().int().nullable(),
  encashable: z.boolean(),
  probationRestricted: z.boolean(),
  genderRestriction: z.string().nullable(),
  appliesTo: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const leavePoliciesListContract = z.array(leavePolicyRowContract);

export const createLeavePolicyContract = leavePolicyRowContract;

export const updateLeavePolicyContract = leavePolicyRowContract;

export const deleteLeavePolicyContract = z.undefined();
