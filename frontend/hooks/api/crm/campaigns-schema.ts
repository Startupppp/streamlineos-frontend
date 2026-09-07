import { z } from "zod";

const campaignSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  status: z.string(),
  channel: z.string().nullable(),
  description: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  targetAudience: z.string().nullable(),
  leads: z.number().int(),
  spend: z.string(),
  roi: z.string(),
  budgetAllocated: z.string().nullable(),
  budgetSpent: z.string().nullable(),
  utmCampaignKey: z.string().nullable(),
  ownerId: z.string().nullable(),
  ownerMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const campaignsListContract = z.object({
  items: z.array(campaignSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export const campaignContract = campaignSchema;

export const campaignRoiContract = z.object({
  spend: z.number(),
  leads: z.number().int(),
  converted: z.number().int(),
  deals: z.number().int(),
  revenueCents: z.number().int(),
  roi: z.number(),
});

const campaignLeadSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  source: z.string(),
  campaignId: z.number().int().nullable(),
  status: z.string(),
  priority: z.string(),
  potentialValue: z.string().nullable(),
  assignedToId: z.string().nullable(),
  company: z.string().nullable(),
  score: z.number().int().nullable(),
  followUpDate: z.string().nullable(),
  convertedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const campaignLeadsContract = z.object({
  items: z.array(campaignLeadSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  total: z.number().int().optional(),
});

export const campaignAttributionContract = z.object({
  campaignId: z.number().int().nullable(),
  campaignName: z.string(),
  touchCount: z.number().int(),
  convertedLeads: z.number().int(),
  dealRevenueCents: z.number().int(),
  roi: z.number(),
});

export const campaignAttributionListContract = z.array(campaignAttributionContract);
