import { z } from "zod";

export const ENTERPRISE_QUOTE_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
] as const;
export type EnterpriseQuoteStatus = (typeof ENTERPRISE_QUOTE_STATUSES)[number];

/** `enterpriseQuoteListItemSchema` (billing-enterprise-response.schemas.ts). */
const enterpriseQuoteListItemContract = z.object({
  id: z.number().int(),
  quoteRef: z.string(),
  subject: z.string(),
  planTier: z.string(),
  negotiatedSeats: z.number().int(),
  pricePerSeatInPaise: z.number().int(),
  contractTermMonths: z.number().int(),
  status: z.enum(ENTERPRISE_QUOTE_STATUSES),
  validUntil: z.string(),
  createdAt: z.string(),
  dealName: z.string().nullable(),
  clientName: z.string().nullable(),
});
export type EnterpriseQuoteListItem = z.infer<typeof enterpriseQuoteListItemContract>;

export const enterpriseQuoteListContract = z.object({
  data: z.array(enterpriseQuoteListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type EnterpriseQuoteList = z.infer<typeof enterpriseQuoteListContract>;

export const enterpriseQuoteCreatedContract = z.object({ id: z.number().int(), quoteRef: z.string() });
export const billingSuccessContract = z.object({ success: z.literal(true) });

/** `appListResponseSchema` (billing-marketplace-response.schemas.ts). */
const appInstallationContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  appId: z.number().int(),
  installedBy: z.string(),
  status: z.string(),
  trialEndsAt: z.string().nullable(),
  installedAt: z.string(),
  cancelledAt: z.string().nullable(),
});
export type AppInstallation = z.infer<typeof appInstallationContract>;
export const appInstallationResponseContract = appInstallationContract;

const marketplaceAppContract = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  iconUrl: z.string().nullable(),
  screenshotUrls: z.array(z.string()).nullable(),
  features: z.array(z.string()).nullable(),
  pricingType: z.string(),
  monthlyPrice: z.number().int(),
  annualPrice: z.number().int(),
  trialDays: z.number().int(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  requiredPlan: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  installation: appInstallationContract.nullable(),
});
export type MarketplaceApp = z.infer<typeof marketplaceAppContract>;
export const marketplaceAppListContract = z.array(marketplaceAppContract);

/** `listAddonsResponseSchema` (billing-core-response.schemas.ts). */
const addonContract = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  available: z.boolean(),
  href: z.string().optional(),
  priceInPaise: z.number().int().optional(),
});
export type BillingAddon = z.infer<typeof addonContract>;
export const addonListContract = z.object({ addons: z.array(addonContract) });

/** `couponListResponseSchema` (billing-core-response.schemas.ts). */
const couponRedemptionContract = z.object({
  id: z.number().int(),
  couponId: z.number().int(),
  orgId: z.string(),
  userId: z.string().nullable(),
  membershipId: z.number().int().nullable(),
  amount: z.string().nullable(),
  amountPaise: z.number().int(),
  redeemedAt: z.string(),
});
const couponContract = z.object({
  id: z.number().int(),
  code: z.string(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.string(),
  minPurchase: z.string().nullable(),
  maxUses: z.number().int().nullable(),
  usedCount: z.number().int(),
  isActive: z.boolean(),
  applicablePlans: z.array(z.string()).nullable(),
  expiresAt: z.string().nullable(),
  orgId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  redemptions: z.array(couponRedemptionContract),
});
export type BillingCoupon = z.infer<typeof couponContract>;
export const couponListContract = z.array(couponContract);
