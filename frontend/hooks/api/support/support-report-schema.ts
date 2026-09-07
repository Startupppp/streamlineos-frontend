import { z } from "zod";

export const supportOverviewContract = z.object({
  newTickets: z.number(),
  openTickets: z.number(),
  backlog: z.number(),
  avgFirstResponseMinutes: z.number().nullable(),
  avgResolutionMinutes: z.number().nullable(),
  slaBreachCount: z.number(),
  slaCompliancePct: z.number().nullable(),
  reopenRate: z.number(),
  ticketsByChannel: z.array(z.object({ channel: z.string(), count: z.number() })),
  ticketsByPriority: z.array(z.object({ priority: z.string(), count: z.number() })),
  ticketsByCategory: z.array(z.object({ category: z.string(), count: z.number() })),
});

export const agentPerformanceListContract = z.array(
  z.object({
    agentId: z.string().nullable(),
    ticketsHandled: z.number(),
    ticketsResolved: z.number(),
    avgFirstResponseMinutes: z.number().nullable(),
    avgResolutionMinutes: z.number().nullable(),
  }),
);

export const queuePerformanceListContract = z.array(
  z.object({
    queueId: z.number().nullable(),
    queueName: z.string(),
    ticketsHandled: z.number(),
    openTickets: z.number(),
    avgResolutionMinutes: z.number().nullable(),
  }),
);

export const channelPerformanceListContract = z.array(
  z.object({
    channel: z.string(),
    ticketsHandled: z.number(),
    avgFirstResponseMinutes: z.number().nullable(),
    avgResolutionMinutes: z.number().nullable(),
  }),
);

export const automationPerformanceListContract = z.array(
  z.object({
    ruleId: z.number().nullable(),
    ruleName: z.string(),
    total: z.number(),
    succeeded: z.number(),
    failed: z.number(),
    skipped: z.number(),
  }),
);
