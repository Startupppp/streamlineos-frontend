import { z } from "zod";

const leadPartyContract = z.object({
  id: z.number().int(),
  partyId: z.string(),
  orgId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  whatsappNumber: z.string().nullable(),
  source: z.string(),
  subSource: z.string().nullable(),
  campaignId: z.number().int().nullable(),
  status: z.string(),
  priority: z.string(),
  investmentInterest: z.string().nullable(),
  potentialValue: z.string().nullable(),
  notes: z.string().nullable(),
  assignedToId: z.string().nullable(),
  assignedById: z.string().nullable(),
  verifiedById: z.string().nullable(),
  assignedAt: z.string().nullable(),
  convertedAt: z.string().nullable(),
  lostReason: z.string().nullable(),
  company: z.string().nullable(),
  designation: z.string().nullable(),
  city: z.string().nullable(),
  referredBy: z.string().nullable(),
  tags: z.array(z.string()),
  score: z.number().int().nullable(),
  slaDeadline: z.string().nullable(),
  website: z.string().nullable(),
  followUpDate: z.string().nullable(),
  followUpNotes: z.string().nullable(),
  customData: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const leadsSourceReportContract = z.object({
  sources: z.array(z.object({
    source: z.string(),
    count: z.number().int(),
    converted: z.number().int(),
    conversionRate: z.number(),
    totalValue: z.number(),
  })),
  total: z.number().int(),
});

export const leadsDuplicateGroupsContract = z.object({
  groups: z.array(
    z.object({
      leads: z.array(
        z.object({
          id: z.number().int(),
          name: z.string(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          company: z.string().nullable(),
          status: z.string(),
          source: z.string().nullable(),
          createdAt: z.string().nullable(),
        }),
      ),
      matchReason: z.array(z.string()),
      score: z.number(),
    }),
  ),
  total: z.number().int(),
});

export const leadsMergeContract = z.object({
  merged: z.literal(true),
  winner: leadPartyContract,
});
