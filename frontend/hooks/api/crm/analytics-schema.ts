import { z } from "zod";

const trendSchema = z.object({
  value: z.number(),
  isPositive: z.boolean(),
});

const statWithTrendSchema = z.object({
  value: z.union([z.number(), z.string()]),
  trend: trendSchema,
});

export const salesDashboardContract = z.object({
  salesStats: z.object({
    pipeline: statWithTrendSchema,
    dealsWon: statWithTrendSchema,
    conversionRate: statWithTrendSchema,
    avgDealSize: statWithTrendSchema,
  }),
  revenueTimeline: z.array(z.object({ month: z.string(), value: z.number() })),
  salesFunnel: z.array(
    z.object({ stage: z.string(), value: z.number(), color: z.string() }),
  ),
  topDeals: z.array(
    z.object({
      company: z.string(),
      value: z.number(),
      stage: z.string(),
      rep: z.string(),
      probability: z.number(),
    }),
  ),
  salesLeaderboard: z.array(
    z.object({
      name: z.string(),
      deals: z.number().int(),
      revenue: z.number(),
      avatar: z.string(),
    }),
  ),
  salesActivity: z.array(
    z.object({
      type: z.string(),
      message: z.string(),
      time: z.string(),
      person: z.string(),
    }),
  ),
  dealsByStage: z.array(
    z.object({
      stage: z.string(),
      count: z.number().int(),
      value: z.number(),
      color: z.string(),
    }),
  ),
  enhancedMetrics: z.object({
    activeClients: z.number().int(),
    inactiveClients: z.number().int(),
    totalCalls: z.number().int(),
    totalMeetings: z.number().int(),
    totalEmails: z.number().int(),
    totalSiteVisits: z.number().int(),
    followUpNeeded: z.number().int(),
  }),
});

export const supportDashboardContract = z.object({
  supportDashboardStats: z.object({
    openTickets: z.object({ value: z.number(), trend: trendSchema }),
    avgResolution: z.object({ value: z.string(), trend: trendSchema }),
    csatScore: z.object({ value: z.string(), trend: trendSchema }),
    responseRate: z.object({ value: z.string(), trend: trendSchema }),
  }),
  ticketStatusBreakdown: z.array(
    z.object({ label: z.string(), value: z.number().int(), color: z.string() }),
  ),
  ticketVolumeTimeline: z.array(
    z.object({ month: z.string(), value: z.number() }),
  ),
  supportActivityFeed: z.array(
    z.object({
      type: z.enum(["deal_won", "meeting", "proposal", "call", "email", "ticket", "escalation"]),
      message: z.string(),
      time: z.string(),
      person: z.string(),
    }),
  ),
  supportTeamMembers: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      access: z.string(),
      avatar: z.string(),
      status: z.enum(["online", "away", "offline"]),
    }),
  ),
  ticketsByPriority: z.array(
    z.object({ label: z.string(), value: z.number().int(), color: z.string() }),
  ),
});

export const salesKpisContract = z.object({
  totalRevenue: z.number(),
  pipelineValue: z.number(),
  closeRate: z.number(),
  avgDealSize: z.number(),
  dealsWon: z.number().int(),
  totalDeals: z.number().int(),
  prevRevenue: z.number(),
  prevCloseRate: z.number(),
  prevAvgDealSize: z.number(),
});

export const revenueVsGoalContract = z.array(
  z.object({
    month: z.string(),
    actual: z.number(),
    target: z.number(),
  }),
);

export const ceDashboardContract = z.object({
  customerStats: z.object({
    totalClients: statWithTrendSchema,
    nps: statWithTrendSchema,
    csat: statWithTrendSchema,
    retention: statWithTrendSchema,
  }),
  clientHealth: z.array(
    z.object({ label: z.string(), value: z.number().int(), color: z.string() }),
  ),
  upcomingRenewals: z.array(
    z.object({
      client: z.string(),
      value: z.number(),
      date: z.string(),
      health: z.enum(["healthy", "at_risk", "critical"]),
    }),
  ),
  keyAccounts: z.array(
    z.object({
      name: z.string(),
      revenue: z.number(),
      health: z.string(),
      csm: z.string(),
      since: z.string(),
    }),
  ),
  customerInteractions: z.array(
    z.object({ type: z.string(), message: z.string(), time: z.string(), person: z.string() }),
  ),
  supportStats: z.object({
    openTickets: z.number().int(),
    avgResolution: z.number(),
    firstResponse: z.number(),
    satisfaction: z.number(),
  }),
  retentionTimeline: z.array(z.object({ month: z.string(), value: z.number() })),
  csatTimeline: z.array(z.object({ month: z.string(), value: z.number() })),
});
