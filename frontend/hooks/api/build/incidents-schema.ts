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

export const incidentDetailContract = incidentRowContract.extend({
  updates: z.array(incidentUpdateRowContract.extend({
    createdByName: z.string().nullable(),
    createdByEmail: z.string().nullable(),
  })),
  decisions: z.array(incidentDecisionRowContract),
  followUpActions: z.array(incidentFollowUpActionRowContract),
});

export const incidentSuccessContract = z.object({ success: z.literal(true) });
