import { z } from "zod";

export const velocityContract = z.array(z.object({
  cycleId: z.number().int(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  committedPoints: z.number().int(),
  completedPoints: z.number().int(),
  committedCount: z.number().int(),
  completedCount: z.number().int(),
})).max(100);

export const burnupDataContract = z.array(z.object({
  date: z.string(),
  scope: z.number(),
  completed: z.number(),
})).max(366);

export const cfdDataContract = z.object({
  dates: z.array(z.string()),
  groups: z.array(z.string()),
  series: z.array(z.object({
    date: z.string(),
    backlog: z.number(),
    unstarted: z.number(),
    started: z.number(),
    completed: z.number(),
    cancelled: z.number(),
  })),
});

export const criticalPathContract = z.object({
  criticalPath: z.array(z.object({
    ticketId: z.number().int(),
    title: z.string(),
    estimate: z.number(),
    earliestStart: z.number(),
    earliestFinish: z.number(),
  })),
  totalDuration: z.number(),
  nodeCount: z.number().int(),
  edgeCount: z.number().int(),
  hasCycle: z.boolean(),
});

export const cycleTimeContract = z.array(z.object({
  week: z.string(),
  avgDays: z.number(),
  count: z.number().int(),
}));

export const leadTimeContract = z.array(z.object({
  week: z.string(),
  avgDays: z.number(),
  p50Days: z.number(),
  p90Days: z.number(),
  count: z.number().int(),
}));

export const snapshotResultContract = z.object({
  captured: z.number().int(),
});

const customerListItemContract = z.object({
  id: z.number().int(),
  orgId: z.string().optional().default(""),
  name: z.string(),
  domain: z.string().nullable(),
  industry: z.string().nullable(),
  size: z.string().nullable(),
  website: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  description: z.string().nullable(),
  healthScore: z.number().nullable().optional(),
  parentId: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  openRequestCount: z.number().int().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const customerPageContract = z.object({
  data: z.array(customerListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
