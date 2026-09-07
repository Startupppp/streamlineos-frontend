import { z } from "zod";

export const analyticsContract = z.object({
  stateDistribution: z.unknown(),
  priorityBreakdown: z.unknown(),
  assigneeCompletion: z.unknown(),
  volumeOverTime: z.unknown(),
  cycleVelocity: z.unknown(),
  estimateVsActual: z.unknown(),
  healthScore: z.number().int(),
  healthStatus: z.string(),
  healthBreakdown: z.object({
    completionPct: z.number().int(),
    onTimePct: z.number().int(),
    velocityScore: z.number().int(),
    overdueTickets: z.number().int(),
    totalTickets: z.number().int(),
  }),
});

export const burnupDataContract = z.object({
  dates: z.array(z.string()),
  completed: z.array(z.number().int()),
  added: z.array(z.number().int()),
  total: z.array(z.number().int()).optional(),
  scope: z.array(z.number().int()).optional(),
}).passthrough();

export const cfdDataContract = z.object({
  dates: z.array(z.string()),
  statuses: z.array(z.string()),
  data: z.array(z.array(z.number().int())),
}).passthrough();

export const criticalPathContract = z.object({
  tasks: z.array(z.object({
    id: z.number().int(),
    title: z.string(),
    duration: z.number().int(),
    earlyStart: z.number().int(),
    earlyFinish: z.number().int(),
    lateStart: z.number().int(),
    lateFinish: z.number().int(),
    slack: z.number().int(),
    isCritical: z.boolean(),
  })).optional(),
  criticalPath: z.array(z.number().int()).optional(),
}).passthrough();

export const velocityContract = z.object({
  sprints: z.array(z.object({
    sprintId: z.number().int(),
    sprintName: z.string(),
    committed: z.number().int(),
    completed: z.number().int(),
  })).optional(),
  avgVelocity: z.number().optional(),
}).passthrough();

export const cycleTimeContract = z.object({
  statuses: z.array(z.string()).optional(),
  avgDays: z.array(z.number()).optional(),
  medianDays: z.array(z.number()).optional(),
}).passthrough();

export const leadTimeContract = z.object({
  avgLeadDays: z.number().optional(),
  medianLeadDays: z.number().optional(),
  tickets: z.array(z.object({
    id: z.number().int(),
    leadDays: z.number(),
  })).optional(),
}).passthrough();

export const snapshotResultContract = z.object({
  captured: z.number().int(),
});

const customerListItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  domain: z.string().nullable(),
  industry: z.string().nullable(),
  size: z.string().nullable(),
  website: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string(),
});

export const customerPageContract = z.object({
  data: z.array(customerListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
