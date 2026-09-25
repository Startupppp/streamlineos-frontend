import { z } from "zod";

export const incidentSeverityContract = z.enum(["critical", "high", "medium", "low"]);
export const incidentStatusContract = z.enum([
  "detected",
  "investigating",
  "mitigating",
  "resolved",
  "postmortem",
  "closed",
]);
export const incidentFollowUpStatusContract = z.enum(["open", "in_progress", "done", "cancelled"]);

export const incidentRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  incidentNumber: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  severity: incidentSeverityContract,
  status: incidentStatusContract,
  impact: z.string().nullable(),
  ownerId: z.string().nullable(),
  rootCause: z.string().nullable(),
  customerComms: z.string().nullable(),
  detectedAt: z.string().nullable(),
  respondedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  responseDueAt: z.string().nullable(),
  resolutionDueAt: z.string().nullable(),
  linkedTicketId: z.number().int().nullable(),
  releaseId: z.number().int().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const incidentListContract = z.array(incidentRowContract);

export const incidentPageContract = z.object({
  data: z.array(incidentRowContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const incidentResponseContract = z.union([incidentPageContract, incidentListContract]);

export const incidentUpdateRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  incidentId: z.number().int(),
  message: z.string(),
  newStatus: incidentStatusContract.nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const incidentDecisionRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  incidentId: z.number().int(),
  decision: z.string(),
  rationale: z.string().nullable(),
  decidedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const incidentFollowUpActionRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  incidentId: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: incidentFollowUpStatusContract,
  dueAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const incidentChildPageContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.number().int().nullable(),
});

const completedIncidentChildPage = {
  limit: 100,
  hasMore: false,
  nextCursor: null,
};

export const incidentDetailContract = incidentRowContract.extend({
  updates: z.array(incidentUpdateRowContract.extend({
    createdByName: z.string().nullable(),
    createdByEmail: z.string().nullable(),
  })),
  decisions: z.array(incidentDecisionRowContract),
  followUpActions: z.array(incidentFollowUpActionRowContract),
  childrenPagination: z.object({
    updates: incidentChildPageContract,
    decisions: incidentChildPageContract,
    followUpActions: incidentChildPageContract,
  }).default({
    updates: completedIncidentChildPage,
    decisions: completedIncidentChildPage,
    followUpActions: completedIncidentChildPage,
  }),
});

export const incidentSuccessContract = z.object({ success: z.literal(true) });

export const createIncidentInputContract = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  severity: incidentSeverityContract.optional(),
  status: incidentStatusContract.optional(),
  impact: z.string().optional(),
  ownerId: z.string().min(1).optional(),
  rootCause: z.string().optional(),
  customerComms: z.string().optional(),
  detectedAt: z.string().optional(),
  responseDueAt: z.string().optional(),
  resolutionDueAt: z.string().optional(),
  linkedTicketId: z.number().int().positive().optional(),
  releaseId: z.number().int().positive().optional(),
}).strict();

export const updateIncidentInputContract = createIncidentInputContract.partial().extend({
  description: z.string().nullable().optional(),
  impact: z.string().nullable().optional(),
  ownerId: z.string().min(1).nullable().optional(),
  rootCause: z.string().nullable().optional(),
  customerComms: z.string().nullable().optional(),
  detectedAt: z.string().nullable().optional(),
  responseDueAt: z.string().nullable().optional(),
  resolutionDueAt: z.string().nullable().optional(),
  linkedTicketId: z.number().int().positive().nullable().optional(),
  releaseId: z.number().int().positive().nullable().optional(),
  followUpWaiverReason: z.string().min(1).max(1000).optional(),
}).strict();

export const addIncidentUpdateInputContract = z.object({
  message: z.string().min(1),
  newStatus: incidentStatusContract.optional(),
  followUpWaiverReason: z.string().min(1).max(1000).optional(),
}).strict();

export const addIncidentDecisionInputContract = z.object({
  decision: z.string().min(1).max(4000),
  rationale: z.string().max(4000).optional(),
}).strict();

export const createIncidentFollowUpActionInputContract = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(4000).optional(),
  ownerId: z.string().min(1).optional(),
  dueAt: z.string().optional(),
}).strict();

export const updateIncidentFollowUpActionInputContract = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(4000).nullable().optional(),
  ownerId: z.string().min(1).nullable().optional(),
  status: incidentFollowUpStatusContract.optional(),
  dueAt: z.string().nullable().optional(),
}).strict();

export type IncidentSeverity = z.infer<typeof incidentSeverityContract>;
export type IncidentStatus = z.infer<typeof incidentStatusContract>;
export type IncidentFollowUpStatus = z.infer<typeof incidentFollowUpStatusContract>;
export type Incident = z.infer<typeof incidentRowContract>;
export type IncidentUpdate = z.infer<typeof incidentUpdateRowContract>;
export type IncidentDecision = z.infer<typeof incidentDecisionRowContract>;
export type IncidentFollowUpAction = z.infer<typeof incidentFollowUpActionRowContract>;
export type IncidentDetail = z.infer<typeof incidentDetailContract>;
export type CreateIncidentInput = z.infer<typeof createIncidentInputContract>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentInputContract>;
export type AddIncidentUpdateInput = z.infer<typeof addIncidentUpdateInputContract>;
export type AddIncidentDecisionInput = z.infer<typeof addIncidentDecisionInputContract>;
export type CreateIncidentFollowUpActionInput = z.infer<typeof createIncidentFollowUpActionInputContract>;
export type UpdateIncidentFollowUpActionInput = z.infer<typeof updateIncidentFollowUpActionInputContract>;
