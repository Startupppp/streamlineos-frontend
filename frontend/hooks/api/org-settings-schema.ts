import { z } from "zod";

/**
 * Contracts for `OrganizationController` handlers that do NOT already have
 * contracts (org members page lives in `organization-schema.ts`).
 *
 * Derived from `organization-core-response.schemas.ts` in the backend.
 * NOT `.strict()`: extra response fields are backward-compatible.
 */

export const orgSettingsContract = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  region: z.string().nullable(),
  timezone: z.string(),
  currency: z.string(),
  fiscalYearStart: z.number(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  billingEmail: z.string().nullable(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).nullable(),
  mfaEnforced: z.boolean(),
  maxConcurrentSessions: z.number().nullable(),
  ownerMembershipId: z.number(),
  onboardingCompletedAt: z.string().nullable(),
  status: z.string(),
  statusV2: z.string().nullable(),
  purgeScheduledAt: z.string().nullable(),
  purgeScheduledBy: z.string().nullable(),
  purgeJobId: z.string().nullable(),
  purgedAt: z.string().nullable(),
  purgeReason: z.string().nullable(),
  deletedAt: z.string().nullable(),
  companySize: z.string().nullable(),
  country: z.string().nullable(),
  legalName: z.string().nullable(),
  orgCode: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  taxNumber: z.string().nullable(),
  supportEmail: z.string().nullable(),
  supportPhone: z.string().nullable(),
  favicon: z.string().nullable(),
  secondaryColor: z.string().nullable(),
  businessHours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
    enabled: z.boolean(),
  })).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  allowedEmailDomains: z.array(z.string()),
  primaryColor: z.string().nullable(),
  loginBgUrl: z.string().nullable(),
  ipAllowlist: z.array(z.unknown()),
  directoryPublic: z.boolean(),
});

export const orgSuccessContract = z.object({ success: z.literal(true) });

export const archivedOrgListContract = z.array(z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
}));

export const archiveOrgContract = z.object({
  success: z.literal(true),
  nextOrgId: z.string().nullable(),
});

export const restoreOrgContract = z.object({
  success: z.literal(true),
  orgId: z.string(),
});

export const createOrgContract = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const leaveOrgContract = z.object({ success: z.literal(true) });

export const deleteOrgContract = z.object({
  success: z.literal(true),
  nextOrgId: z.string().nullable(),
});
