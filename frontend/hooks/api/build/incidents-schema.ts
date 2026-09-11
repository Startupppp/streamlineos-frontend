import { z } from "zod";

export const incidentRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  incidentNumber: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  severity: z.string(),
  status: z.string(),
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
  newStatus: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const incidentDetailContract = incidentRowContract.extend({
  updates: z.array(incidentUpdateRowContract.extend({
    createdByName: z.string().nullable(),
    createdByEmail: z.string().nullable(),
  })),
});

export const incidentSuccessContract = z.object({ success: z.literal(true) });
