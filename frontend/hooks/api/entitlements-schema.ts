import { z } from "zod";

/**
 * `GET /billing/entitlements`. Every paid boundary in the app is decided from
 * this body: a `limits` entry that quietly stops arriving reads as `undefined`,
 * and a seat counter rendered from `undefined` is a number nobody can distrust.
 *
 * Not `.strict()`: a new plan limit is an additive backend deploy and must not
 * fail the billing screen. A dropped or retyped one does.
 */

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

/**
 * Written out rather than built from a key list: `Object.fromEntries` returns a
 * string-indexed bag, so the shape had to be asserted back into a keyed record,
 * and that assertion is what let the list and the parsed type disagree.
 */
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
