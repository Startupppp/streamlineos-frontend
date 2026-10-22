import { z } from "zod";


export const entitlementTierContract = z.enum(["FREE", "PAID", "ENTERPRISE"]);

export const entitlementPlanContract = z.enum([
  "FREE",
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
]);

export const entitlementLimitContract = z.object({
  limit: z.number().nullable(),
  used: z.number(),
});

export const entitlementLimitsContract = z.object({
  members: entitlementLimitContract,
  projects: entitlementLimitContract,
  kbPages: entitlementLimitContract,
  chatChannels: entitlementLimitContract,
  crmLeads: entitlementLimitContract,
  crmContacts: entitlementLimitContract,
  crmDeals: entitlementLimitContract,
  supportTickets: entitlementLimitContract,
  automations: entitlementLimitContract,
  signEnvelopes: entitlementLimitContract,
  surveys: entitlementLimitContract,
  acctInvoices: entitlementLimitContract,
  hrCandidates: entitlementLimitContract,
  hrJobPostings: entitlementLimitContract,
});

export const entitlementsContract = z.object({
  tier: entitlementTierContract,
  plan: entitlementPlanContract,
  seatLimit: z.number().nullable(),
  lockedModules: z.array(z.string()),
  features: z.object({
    chatGroupHuddles: z.boolean(),
    chatVoiceVideo: z.boolean(),
    kbPublicSharing: z.boolean(),
    hrFull: z.boolean(),
  }),
  limits: entitlementLimitsContract,
});

export type EntitlementLimit = z.infer<typeof entitlementLimitContract>;
export type Entitlements = z.infer<typeof entitlementsContract>;
