import { z } from "zod";

const benefitPlanContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  category: z.enum(["health", "life", "accident", "retirement", "wellness", "perk", "other"]),
  provider: z.string().nullable(),
  description: z.string().nullable(),
  coverage: z.record(z.string(), z.unknown()).nullable(),
  premiumCents: z.number().nullable(),
  employerContributionPct: z.number(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  status: z.enum(["draft", "active", "archived"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const benefitPlansPageContract = z.object({
  data: z.array(benefitPlanContract),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const benefitPlanContract_ = benefitPlanContract;

const enrollmentContract = z.object({
  id: z.number(),
  orgId: z.string(),
  planId: z.number(),
  userId: z.string(),
  status: z.enum(["pending", "active", "waived", "terminated"]),
  enrolledAt: z.string(),
  effectiveFrom: z.string().nullable(),
  dependentsCovered: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const enrollmentResponseContract = enrollmentContract;
export const waiveResponseContract = enrollmentContract;

const dependentContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  name: z.string(),
  relationship: z.enum(["spouse", "child", "parent", "other"]),
  dateOfBirth: z.string().nullable(),
  isCovered: z.boolean(),
  createdAt: z.string(),
});

export const dependentListContract = z.array(dependentContract);
export const dependentSingleContract = dependentContract;

export const deleteDependentContract = z.object({ ok: z.literal(true) });

export const myBenefitsContract = z.object({
  enrollments: z.array(enrollmentContract.extend({ plan: benefitPlanContract })),
  dependents: z.array(dependentContract),
});

const claimContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  planId: z.number(),
  claimNumber: z.string(),
  amountCents: z.number(),
  status: z.enum(["submitted", "in_review", "approved", "rejected", "paid"]),
  documents: z.array(z.object({ url: z.string(), name: z.string() })).nullable(),
  submittedAt: z.string(),
  decidedAt: z.string().nullable(),
  decidedBy: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  payoutRoute: z.enum(["payroll_payable", "finance_payable", "already_paid"]).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const userMinContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export const claimsPageContract = z.object({
  data: z.array(claimContract.extend({ user: userMinContract, plan: benefitPlanContract.nullable() })),
  pagination: z.object({ limit: z.number(), hasMore: z.boolean(), nextCursor: z.string().nullable() }),
});

export const claimSingleContract = claimContract;
