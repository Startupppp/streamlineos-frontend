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

const LIMIT_KEYS = [
  "members",
  "projects",
  "kbPages",
  "chatChannels",
  "crmLeads",
  "crmContacts",
  "crmDeals",
  "supportTickets",
  "automations",
  "signEnvelopes",
  "surveys",
  "acctInvoices",
  "hrCandidates",
  "hrJobPostings",
] as const;

export const entitlementLimitsContract = z.object(
  Object.fromEntries(
    LIMIT_KEYS.map((key) => [key, entitlementLimitContract]),
  ) as Record<(typeof LIMIT_KEYS)[number], typeof entitlementLimitContract>,
);

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
