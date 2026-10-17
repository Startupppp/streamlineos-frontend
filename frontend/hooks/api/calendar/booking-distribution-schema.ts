import { z } from "zod";

const copy = z.object({
  locale: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  consentLabel: z.string().nullable(),
  fieldLabels: z.record(z.string(), z.string()),
});

const branding = z.object({
  displayName: z.string().nullable(),
  logoUrl: z.string().nullable(),
  primaryColor: z.string().nullable(),
  showPoweredBy: z.boolean(),
});

const attribution = z.object({
  source: z.string().nullable(),
  medium: z.string().nullable(),
  campaign: z.string().nullable(),
  content: z.string().nullable(),
  term: z.string().nullable(),
  referrerDomain: z.string().nullable(),
});

export const distributionContract = z.object({
  ruleId: z.number().int(),
  status: z.enum(["active", "paused", "revoked"]),
  version: z.number().int().positive(),
  defaultLocale: z.string(),
  localizedCopy: z.array(copy),
  branding,
  allowedOrigins: z.array(z.string()),
  callbackFacts: z.array(z.enum(["outcome", "bookingId", "start", "end"])),
  intakeKeys: z.array(z.string()),
  consentRequired: z.boolean(),
  minimumCompletionSeconds: z.number().int(),
  maximumSessionAttempts: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const accessLinkContract = z.object({
  id: z.string().uuid(),
  channel: z.enum(["page", "embed"]),
  allowedOrigin: z.string().nullable(),
  singleUse: z.boolean(),
  status: z.enum(["active", "consumed", "revoked"]),
  expiresAt: z.string().nullable(),
  consumedAt: z.string().nullable(),
  consumedBookingId: z.string().uuid().nullable(),
  revokedAt: z.string().nullable(),
  attribution,
  createdAt: z.string(),
});

export const accessLinksContract = z.array(accessLinkContract);
export const createdAccessLinkContract = accessLinkContract.extend({ token: z.string() });
export const distributionOperationsContract = z.object({
  activeLinks: z.number().int().nonnegative(),
  revokedLinks: z.number().int().nonnegative(),
  consumedLinks: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  blockedSessions: z.number().int().nonnegative(),
  completedConversions: z.number().int().nonnegative(),
});

export type BookingDistribution = z.infer<typeof distributionContract>;
export type BookingAccessLink = z.infer<typeof accessLinkContract>;
export type CreatedBookingAccessLink = z.infer<typeof createdAccessLinkContract>;
export type BookingDistributionOperations = z.infer<typeof distributionOperationsContract>;
