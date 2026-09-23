import { z } from "zod";

export const moduleDenialReasonContract = z.enum([
  "not-in-plan",
  "org-disabled",
  "user-denied",
]);

export const moduleDenialDetailsContract = z.object({
  moduleKey: z.string().min(1),
  reason: moduleDenialReasonContract,
  upgradePath: z.string().min(1).nullable(),
});

export const quotaDetailsContract = z.object({
  limitKey: z.string().min(1),
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  upgradePath: z.string().min(1),
});

export const featureDetailsContract = z.object({
  feature: z.string().min(1),
  requiredPlan: z.string().min(1),
  upgradePath: z.string().min(1),
});

export type QuotaDetails = z.infer<typeof quotaDetailsContract>;
export type FeatureDetails = z.infer<typeof featureDetailsContract>;
export type ModuleDenialReason = z.infer<typeof moduleDenialReasonContract>;
export type ModuleDenialDetails = z.infer<typeof moduleDenialDetailsContract>;
