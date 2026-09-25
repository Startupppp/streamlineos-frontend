import { z } from "zod";

/**
 * Ticket 08. Mirrors `leavePolicyTemplateOfferSchema` and its siblings in the
 * backend's `time-leave-response.schemas.ts`, field for field (FE-28).
 * Not `.strict()`: an added backend field is a compatible deploy.
 */
export const leavePolicyTemplateKeyContract = z.enum(["casual", "sick", "comp_off"]);

export const leavePolicyTemplateContract = z.object({
  key: leavePolicyTemplateKeyContract,
  leaveTypeName: z.string(),
  policyName: z.string(),
  description: z.string(),
  daysPerYear: z.number().int(),
  carryForward: z.boolean(),
  accrualType: z.enum(["ANNUAL", "MONTHLY"]),
  accrualRate: z.string(),
  maxBalance: z.string().nullable(),
  carryForwardDays: z.string(),
  encashable: z.boolean(),
  probationRestricted: z.boolean(),
});

export const leavePolicyTemplateOfferContract = z.object({
  templates: z.array(leavePolicyTemplateContract),
  alreadyPresent: z.array(leavePolicyTemplateKeyContract),
  dismissedAt: z.string().nullable(),
  policyCount: z.number().int(),
  shouldOffer: z.boolean(),
});

export const leavePolicyTemplateDismissContract = z.object({
  dismissedAt: z.string(),
});

export const leavePolicyTemplateImportContract = z.object({
  created: z.number().int(),
  skipped: z.array(leavePolicyTemplateKeyContract),
});

export type LeavePolicyTemplateKey = z.infer<typeof leavePolicyTemplateKeyContract>;
export type LeavePolicyTemplate = z.infer<typeof leavePolicyTemplateContract>;
export type LeavePolicyTemplateOffer = z.infer<typeof leavePolicyTemplateOfferContract>;
