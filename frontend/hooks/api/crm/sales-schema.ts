import { z } from "zod";

/** Mirrors `backend/src/modules/sales/dto/sales-response.schemas.ts`, field for field. */

export const salesFunnelContract = z.array(
  z.object({
    stage: z.string(),
    count: z.number().int(),
    value: z.number(),
    color: z.string(),
    dropOffPct: z.number().nullable(),
  }),
);

const leaderboardRow = z.object({
  repId: z.number().int(),
  name: z.string(),
  initials: z.string(),
  dealsWon: z.number().int(),
  totalDeals: z.number().int(),
  revenue: z.number(),
  winRate: z.number(),
});

export const salesLeaderboardContract = z.array(leaderboardRow);

export const salesVelocityContract = z.object({
  avgDaysToClose: z.number(),
  medianDaysToClose: z.number(),
  fastestCloseDays: z.number(),
  slowestCloseDays: z.number(),
  dealCount: z.number().int(),
});

/** One row per idle open deal. */
export const salesAgingContract = z.array(
  z.object({
    id: z.number().int(),
    companyName: z.string(),
    stage: z.string(),
    value: z.number(),
    daysSinceUpdate: z.number().int(),
    salesRepId: z.number().int().nullable(),
  }),
);

export const salesCohortContract = z.array(
  z.object({
    cohortMonth: z.string(),
    created: z.number().int(),
    converted: z.number().int(),
    conversionRate: z.number(),
    avgDaysToConvert: z.number().nullable(),
  }),
);

export const salesCycleLengthContract = z.object({
  avgDays: z.number().int().nullable(),
  medianDays: z.number().int().nullable(),
  minDays: z.number().int().optional(),
  maxDays: z.number().int().optional(),
  histogram: z.array(z.object({ label: z.string(), count: z.number().int() })),
  totalDeals: z.number().int(),
});

export const salesLostAnalysisContract = z.object({
  total: z.number().int(),
  totalValue: z.number(),
  reasons: z.array(
    z.object({ reason: z.string(), count: z.number().int(), totalValue: z.number(), pct: z.number().int() }),
  ),
});

const repComparisonData = leaderboardRow.extend({
  avgDealSize: z.number().int(),
  monthly: z.array(z.object({ month: z.string(), dealsWon: z.number().int(), revenue: z.number() })),
});

export const salesRepComparisonContract = z.object({ rep1: repComparisonData, rep2: repComparisonData });

export const salesQuotaContract = z.object({
  id: z.number().int(),
  userId: z.string(),
  userName: z.string().nullable(),
  period: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  targetRevenue: z.string(),
  actualRevenue: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  attainmentPct: z.number().int(),
});

export const salesQuotasContract = z.array(salesQuotaContract);

export const salesCreatedQuotaContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  period: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  targetRevenue: z.string(),
  actualRevenue: z.string().nullable(),
  notes: z.string().nullable(),
  setById: z.string().nullable(),
  createdAt: z.string(),
});

export const playbookEntryContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  category: z.string().nullable(),
  title: z.string(),
  content: z.string(),
  sortOrder: z.number().int(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const playbookEntriesContract = z.array(playbookEntryContract);

export const playbookRemovedContract = z.object({ success: z.literal(true) });

export type SalesFunnel = z.infer<typeof salesFunnelContract>;
export type SalesLeaderboard = z.infer<typeof salesLeaderboardContract>;
export type SalesVelocity = z.infer<typeof salesVelocityContract>;
export type SalesAging = z.infer<typeof salesAgingContract>;
export type SalesCohort = z.infer<typeof salesCohortContract>;
export type SalesCycleLength = z.infer<typeof salesCycleLengthContract>;
export type SalesLostAnalysis = z.infer<typeof salesLostAnalysisContract>;
export type SalesRepComparison = z.infer<typeof salesRepComparisonContract>;
export type SalesQuota = z.infer<typeof salesQuotaContract>;
export type SalesCreatedQuota = z.infer<typeof salesCreatedQuotaContract>;
export type PlaybookEntry = z.infer<typeof playbookEntryContract>;
